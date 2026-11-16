-- Pulse: story clusters ("Full coverage").
-- Stories different publishers wrote about the same event share a cluster.
-- News ingestion finds them (src/lib/ingest/cluster.ts) and saves them with
-- public.assign_story_clusters. Story pages list a cluster as a timeline, and
-- "For you" shows each event once, ranking events more publishers cover higher.
--
-- Safe to run again.

-- ---------------------------------------------------------------------------
-- Clusters

create table if not exists public.story_clusters (
  id uuid primary key default gen_random_uuid(),
  -- Kept by public.refresh_story_cluster.
  articles_count integer not null default 0,
  sources_count integer not null default 0,
  first_published_at timestamptz,
  last_published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.articles
  add column if not exists cluster_id uuid references public.story_clusters (id) on delete set null;

create index if not exists articles_cluster_idx on public.articles (cluster_id, published_at)
  where cluster_id is not null;

alter table public.story_clusters enable row level security;

drop policy if exists "Story clusters are public" on public.story_clusters;
create policy "Story clusters are public" on public.story_clusters for select using (true);

-- Recounts a cluster. One story on its own isn't a cluster, so a cluster left
-- with fewer than two is removed (its last story's cluster_id clears).
create or replace function public.refresh_story_cluster(cluster uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.story_clusters c
  set articles_count = counts.articles,
      sources_count = counts.sources,
      first_published_at = counts.first_at,
      last_published_at = counts.last_at
  from (
    select count(*)::integer as articles,
      count(distinct a.source_id)::integer as sources,
      min(a.published_at) as first_at,
      max(a.published_at) as last_at
    from public.articles a
    where a.cluster_id = refresh_story_cluster.cluster
  ) as counts
  where c.id = refresh_story_cluster.cluster;

  delete from public.story_clusters c
  where c.id = refresh_story_cluster.cluster and c.articles_count < 2;
$$;

create or replace function public.sync_story_clusters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op <> 'INSERT' and old.cluster_id is not null then
    perform public.refresh_story_cluster(old.cluster_id);
  end if;
  if tg_op <> 'DELETE' and new.cluster_id is not null
    and (tg_op = 'INSERT' or new.cluster_id is distinct from old.cluster_id) then
    perform public.refresh_story_cluster(new.cluster_id);
  end if;
  return null;
end;
$$;

drop trigger if exists articles_story_clusters on public.articles;
create trigger articles_story_clusters
  after insert or delete or update of cluster_id, source_id, published_at on public.articles
  for each row execute function public.sync_story_clusters();

-- Saves what ingestion found: [{ "cluster_id": uuid | null, "article_ids": [uuid, …] }].
-- A null cluster_id starts a new cluster. Returns how many stories moved.
create or replace function public.assign_story_clusters(assignments jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment jsonb;
  cluster uuid;
  moved integer;
  total integer := 0;
begin
  for assignment in select value from jsonb_array_elements(coalesce(assignments, '[]'::jsonb)) loop
    cluster := nullif(assignment ->> 'cluster_id', '')::uuid;
    if cluster is null or not exists (select 1 from public.story_clusters c where c.id = cluster) then
      insert into public.story_clusters default values returning id into cluster;
    end if;

    update public.articles a
    set cluster_id = cluster
    where a.id in (select value::uuid from jsonb_array_elements_text(assignment -> 'article_ids'))
      and a.cluster_id is distinct from cluster;
    get diagnostics moved = row_count;
    total := total + moved;

    -- Also clears a new cluster whose stories were deleted in the meantime.
    perform public.refresh_story_cluster(cluster);
  end loop;
  return total;
end;
$$;

revoke all on function public.refresh_story_cluster(uuid) from public, anon, authenticated;
revoke all on function public.sync_story_clusters() from public, anon, authenticated;
revoke all on function public.assign_story_clusters(jsonb) from public, anon, authenticated;
grant execute on function public.assign_story_clusters(jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Feeds

-- Stories as the feed functions return them, now with their cluster's counts.
create or replace function public.article_json(article public.articles)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select (to_jsonb(article) - 'search_vector')
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

-- "For you": the newest 1,000 stories published by `as_of`, ranked, with only
-- the best-ranked story of each cluster. Newer stories rank higher. Likes,
-- reposts, replies and reads lift a story, with diminishing returns, and so
-- does coverage by more publishers. Stories in the reader's topics count
-- double. Later pages pass the same `as_of`, so the order holds while the
-- reader scrolls. Keep the formula in sync with src/lib/ranking.ts.
create or replace function public.for_you_feed(
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
