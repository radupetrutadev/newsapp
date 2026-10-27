-- Pulse: search by meaning, and "For you" that learns from reading.
-- News ingestion gives each story an embedding (OpenAI text-embedding-3-small,
-- 512 dimensions; see src/lib/search/openai.ts). Search fuses full-text
-- matches with the stories closest in meaning to the query. Stories a
-- signed-in reader opens are kept in their reading history, which "For you"
-- uses to rank stories like them higher and the ones they've read lower.
--
-- Safe to run again.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Story embeddings

alter table public.articles add column if not exists embedding extensions.vector(512);

create index if not exists articles_embedding_idx on public.articles
  using hnsw (embedding extensions.vector_cosine_ops);

-- Saves embeddings from ingestion: [{ "id": uuid, "embedding": [number, …] }].
create or replace function public.set_article_embeddings(items jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated integer;
begin
  update public.articles a
  set embedding = (item ->> 'embedding')::extensions.vector
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) as item
  where a.id = (item ->> 'id')::uuid;
  get diagnostics updated = row_count;
  return updated;
end;
$$;

revoke all on function public.set_article_embeddings(jsonb) from public, anon, authenticated;
grant execute on function public.set_article_embeddings(jsonb) to service_role;

-- Feeds send stories as JSON; the embedding is for the database only.
create or replace function public.article_json(article public.articles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select (to_jsonb(article) - 'search_vector' - 'embedding')
    || jsonb_build_object(
      'source', to_jsonb(s),
      'cluster', (
        select jsonb_build_object('articles_count', c.articles_count, 'sources_count', c.sources_count)
        from public.story_clusters c
        where c.id = article.cluster_id
      )
    )
  from public.sources s
  where s.id = article.source_id
$$;

-- ---------------------------------------------------------------------------
-- Search: full-text matches and the closest stories in meaning, fused by
-- reciprocal rank (each list adds 1 / (60 + position) to a story's score).
-- Without `query_embedding` it's the full-text search as before. Stories less
-- similar than `min_similarity` (cosine) don't count as meaning matches, so a
-- query about nothing in particular doesn't return everything.

drop function if exists public.search_articles(text, timestamptz, integer, integer);

create or replace function public.search_articles(
  query text,
  as_of timestamptz,
  page_offset integer,
  page_size integer,
  query_embedding extensions.vector(512) default null,
  min_similarity double precision default 0.3
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with words as (
    select public.article_search_query(query) as tsquery
  ),
  text_matches as (
    -- Headline matches count most, and newer stories rank higher.
    select matched.id, row_number() over (order by matched.rank desc, matched.published_at desc, matched.id desc) as position
    from (
      select a.id, a.published_at,
        ts_rank(a.search_vector, w.tsquery)
          / (1 + greatest(extract(epoch from as_of - a.published_at), 0) / 604800) as rank
      from public.articles a, words w
      where a.search_vector @@ w.tsquery
        and a.published_at <= as_of
      order by rank desc, a.published_at desc, a.id desc
      limit 1000
    ) as matched
  ),
  meaning_matches as (
    select nearest.id, row_number() over (order by nearest.distance, nearest.id) as position
    from (
      select a.id, a.embedding operator(extensions.<=>) query_embedding as distance
      from public.articles a
      where query_embedding is not null
        and a.embedding is not null
        and a.published_at <= as_of
      order by a.embedding operator(extensions.<=>) query_embedding
      limit 40
    ) as nearest
    where 1 - nearest.distance >= min_similarity
  ),
  fused as (
    select matches.id, sum(1.0 / (60 + matches.position)) as score
    from (
      select id, position from text_matches
      union all
      select id, position from meaning_matches
    ) as matches
    group by matches.id
  )
  select coalesce(
    jsonb_agg(
      public.article_json(page.article)
      order by page.score desc, (page.article).published_at desc, (page.article).id desc
    ),
    '[]'
  )
  from (
    select a as article, f.score
    from fused f
    join public.articles a on a.id = f.id
    order by f.score desc, a.published_at desc, a.id desc
    offset greatest(page_offset, 0)
    limit least(greatest(page_size, 0), 100)
  ) as page
$$;

-- ---------------------------------------------------------------------------
-- Reading history

create table if not exists public.reading_history (
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists reading_history_recent_idx on public.reading_history (user_id, read_at desc);

alter table public.reading_history enable row level security;

drop policy if exists "Readers see their own history" on public.reading_history;
create policy "Readers see their own history" on public.reading_history
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Readers clear their own history" on public.reading_history;
create policy "Readers clear their own history" on public.reading_history
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Readers can turn it off in Settings.
alter table public.user_settings add column if not exists personalize_feed boolean not null default true;

-- Counts a view, and for a signed-in reader adds the story to their history,
-- which keeps their newest 200.
create or replace function public.record_article_view(article_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reader uuid := auth.uid();
begin
  update public.articles a set views_count = a.views_count + 1 where a.id = record_article_view.article_id;
  if reader is null or not found then
    return;
  end if;

  insert into public.reading_history (user_id, article_id)
  values (reader, record_article_view.article_id)
  on conflict on constraint reading_history_pkey do update set read_at = now();

  delete from public.reading_history h
  where h.user_id = reader
    and h.article_id not in (
      select r.article_id from public.reading_history r
      where r.user_id = reader
      order by r.read_at desc
      limit 200
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- "For you": as before (one story per event, newer and more engaging stories
-- higher), and with `personalize` for a signed-in reader who hasn't turned it
-- off, their 50 most recent reads before `as_of` shape the ranking:
--   - stories they've read keep a quarter of their rank;
--   - other stories rise by up to double, by how close they are to what they
--     read: in meaning when both have embeddings (cosine similarity to the
--     average of their reads, from 0.2 to 0.6), otherwise by the share of their
--     reads in the story's topic.
-- Keep the formula in sync with src/lib/ranking.ts.

drop function if exists public.for_you_feed(timestamptz, integer, integer, text[], text);

create or replace function public.for_you_feed(
  as_of timestamptz,
  page_offset integer,
  page_size integer,
  topics text[] default '{}',
  category text default null,
  personalize boolean default false
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with reader as (
    select auth.uid() as id
    where personalize
      and auth.uid() is not null
      and coalesce((select s.personalize_feed from public.user_settings s where s.user_id = auth.uid()), true)
  ),
  history as (
    select h.article_id, a.category, a.embedding
    from reader r
    join public.reading_history h on h.user_id = r.id and h.read_at <= as_of
    join public.articles a on a.id = h.article_id
    order by h.read_at desc
    limit 50
  ),
  interest as (
    select extensions.avg(history.embedding) as embedding from history where history.embedding is not null
  ),
  topic_share as (
    select history.category, count(*)::double precision / sum(count(*)) over () as share
    from history
    group by history.category
  )
  select coalesce(
    jsonb_agg(
      public.article_json(page.article)
      order by page.rank desc, (page.article).published_at desc, (page.article).id desc
    ),
    '[]'
  )
  from (
    select event.article, event.rank
    from (
      select distinct on (coalesce((ranked.article).cluster_id, (ranked.article).id))
        ranked.article,
        ranked.rank
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
            * (1 + 0.5 * ln(greatest(coalesce(candidate.sources, 1), 1)))
            * (
              case
                when exists (select 1 from history where history.article_id = (candidate.article).id) then 0.25
                when (candidate.article).embedding is not null and (select embedding from interest) is not null then
                  1 + least(greatest(
                    (1 - ((candidate.article).embedding operator(extensions.<=>) (select embedding from interest)) - 0.2) / 0.4,
                    0), 1)
                else 1 + coalesce((select t.share from topic_share t where t.category = (candidate.article).category), 0)
              end
            )
            / power(greatest(extract(epoch from as_of - (candidate.article).published_at) / 3600, 0) + 2, 1.5)
          ) as rank
        from (
          select a as article, c.sources_count as sources
          from public.articles a
          left join public.story_clusters c on c.id = a.cluster_id
          where a.published_at <= as_of
            and (for_you_feed.category is null or a.category = for_you_feed.category)
          order by a.published_at desc, a.id desc
          limit 1000
        ) as candidate
      ) as ranked
      order by
        coalesce((ranked.article).cluster_id, (ranked.article).id),
        ranked.rank desc,
        (ranked.article).published_at desc,
        (ranked.article).id desc
    ) as event
    order by event.rank desc, (event.article).published_at desc, (event.article).id desc
    offset greatest(page_offset, 0)
    limit least(greatest(page_size, 0), 100)
  ) as page
$$;
