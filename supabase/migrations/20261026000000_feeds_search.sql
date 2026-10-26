-- Pulse: feeds and search run in the database.
-- Paging through older stories, the ranked "For you" feed, stories from the
-- sources each reader follows, and full-text search. The app calls these
-- through src/lib/data/feeds.ts.

-- ---------------------------------------------------------------------------
-- Paging indexes: newest first, with the id breaking ties between stories
-- published at the same moment, so a page boundary never skips or repeats one.

drop index public.articles_published_at_idx;
drop index public.articles_category_published_at_idx;
drop index public.articles_source_published_at_idx;

create index articles_published_at_idx on public.articles (published_at desc, id desc);
create index articles_category_published_at_idx on public.articles (category, published_at desc, id desc);
create index articles_source_published_at_idx on public.articles (source_id, published_at desc, id desc);

-- The newest breaking story, for the banner on the home feed.
create index articles_breaking_idx on public.articles (published_at desc) where is_breaking;

-- ---------------------------------------------------------------------------
-- Full-text search

-- What search looks at, most important first: the headline, tags, summary and
-- topic. CamelCase tags such as "MethaneDeal" are also indexed as separate
-- words. Rows keep the vector they were stored with if this function changes,
-- so recreate the column after editing it.
create function public.article_search_vector(title text, summary text, tags text[], category text)
returns tsvector
language sql
immutable
parallel safe
set search_path = ''
as $$
  select
    setweight(to_tsvector('english', title), 'A')
    || setweight(to_tsvector('english', case when split = raw then raw else raw || ' ' || split end), 'B')
    || setweight(to_tsvector('english', summary), 'C')
    || setweight(to_tsvector('english', category), 'D')
  from (select array_to_string(tags, ' ') as raw) as t,
    lateral (select regexp_replace(t.raw, '([a-z0-9])([A-Z])', '\1 \2', 'g') as split) as s
$$;

alter table public.articles
  add column search_vector tsvector
  generated always as (public.article_search_vector(title, summary, tags, category)) stored;

create index articles_search_idx on public.articles using gin (search_vector);

-- Turns what a reader typed into a query that needs every word. Words of four
-- letters or more also match longer words that start with them ("clim" finds
-- "climate"); shorter ones match exactly, so "AI" doesn't find "air". Null when
-- nothing searchable is left, such as only "the", which matches nothing.
create function public.article_search_query(query text)
returns tsquery
language sql
immutable
parallel safe
set search_path = ''
as $$
  select to_tsquery(
    'simple',
    string_agg(
      '''' || replace(replace(lexeme, '\', '\\'), '''', '''''') || ''''
        || case when length(lexeme) >= 4 then ':*' else '' end,
      ' & '
    )
  )
  from unnest(tsvector_to_array(to_tsvector('english', left(query, 200)))) as lexeme
$$;

-- ---------------------------------------------------------------------------
-- Feed pages
--
-- Each returns one page of stories as a JSON array, every story shaped like an
-- "articles" row with "source:sources(*)" embedded. JSON keeps the ranked order,
-- which the API couldn't sort by otherwise. Pages hold at most 100 stories.

create function public.article_json(article public.articles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select (to_jsonb(article) - 'search_vector') || jsonb_build_object('source', to_jsonb(s))
  from public.sources s
  where s.id = article.source_id
$$;

-- "For you": the newest 1,000 stories published by `as_of`, ranked. Newer
-- stories rank higher. Likes, reposts, replies and reads lift a story, with
-- diminishing returns. Stories in the reader's topics count double. Later pages
-- pass the same `as_of`, so the order holds while the reader scrolls and new
-- stories wait for the next refresh. Keep the formula in sync with
-- src/lib/ranking.ts.
create function public.for_you_feed(
  as_of timestamptz,
  page_offset integer,
  page_size integer,
  topics text[] default '{}',
  category text default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      public.article_json(page.article)
      order by page.rank desc, (page.article).published_at desc, (page.article).id desc
    ),
    '[]'
  )
  from (
    select
      candidate.article,
      (
        (case when (candidate.article).category = any (topics) then 2 else 1 end)
        * (1 + ln(
          1.0
          + (candidate.article).likes_count
          + 2.0 * (candidate.article).reposts_count
          + 3.0 * (candidate.article).comments_count
          + (candidate.article).views_count / 20.0
        ))
        / power(greatest(extract(epoch from as_of - (candidate.article).published_at) / 3600, 0) + 2, 1.5)
      ) as rank
    from (
      select a as article
      from public.articles a
      where a.published_at <= as_of
        and (for_you_feed.category is null or a.category = for_you_feed.category)
      order by a.published_at desc, a.id desc
      limit 1000
    ) as candidate
    order by rank desc, (candidate.article).published_at desc, (candidate.article).id desc
    offset greatest(page_offset, 0)
    limit least(greatest(page_size, 0), 100)
  ) as page
$$;

-- "Following": stories from the sources the signed-in reader follows, newest
-- first, older than the last story of the previous page. Empty when signed out.
create function public.following_feed(
  page_size integer,
  category text default null,
  before_at timestamptz default null,
  before_id uuid default null
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      public.article_json(page.article)
      order by (page.article).published_at desc, (page.article).id desc
    ),
    '[]'
  )
  from (
    select a as article
    from public.articles a
    where a.source_id in (select f.source_id from public.follows f where f.user_id = (select auth.uid()))
      and (following_feed.category is null or a.category = following_feed.category)
      and (a.published_at, a.id) < (
        coalesce(before_at, 'infinity'),
        coalesce(before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
      )
    order by a.published_at desc, a.id desc
    limit least(greatest(page_size, 0), 100)
  ) as page
$$;

-- Search results, best match first. A match in the headline counts most, and
-- relevance halves for every week a story has aged, so recent coverage leads.
create function public.search_articles(
  query text,
  as_of timestamptz,
  page_offset integer,
  page_size integer
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      public.article_json(page.article)
      order by page.rank desc, (page.article).published_at desc, (page.article).id desc
    ),
    '[]'
  )
  from (
    select
      a as article,
      ts_rank(a.search_vector, (select public.article_search_query(query)))
        / (1 + greatest(extract(epoch from as_of - a.published_at), 0) / 604800) as rank
    from public.articles a
    where a.search_vector @@ (select public.article_search_query(query))
      and a.published_at <= as_of
    order by rank desc, a.published_at desc, a.id desc
    offset greatest(page_offset, 0)
    limit least(greatest(page_size, 0), 100)
  ) as page
$$;

-- ---------------------------------------------------------------------------
-- Counts for the topic pages: stories and reads per topic since `since`.

create function public.topic_stats(since timestamptz)
returns table (category text, stories integer, views bigint)
language sql
stable
set search_path = ''
as $$
  select a.category, count(*)::integer, coalesce(sum(a.views_count), 0)::bigint
  from public.articles a
  where a.published_at >= since
  group by a.category
$$;
