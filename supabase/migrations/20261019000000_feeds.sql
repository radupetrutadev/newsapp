-- Pulse: RSS/Atom ingestion.
-- Feeds are polled by /api/ingest (see src/lib/ingest), which runs with the
-- service-role key and therefore bypasses RLS.

-- ---------------------------------------------------------------------------
-- Feeds: one row per RSS/Atom URL. A source can have several feeds, each
-- mapped to a category (e.g. a publisher's World and Technology feeds).

create table public.feeds (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources (id) on delete cascade,
  url text not null unique check (url ~ '^https?://'),
  category text not null check (
    category in ('world', 'politics', 'business', 'tech', 'science', 'health', 'sports', 'entertainment', 'climate')
  ),
  active boolean not null default true,
  -- Conditional GET state, so unchanged feeds cost one 304 response.
  etag text,
  last_modified text,
  last_fetched_at timestamptz,
  last_success_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create index feeds_source_idx on public.feeds (source_id);

-- Operational config only: no policies, so only the service role can read or write.
alter table public.feeds enable row level security;

-- ---------------------------------------------------------------------------
-- Store each story once, even when it appears in several feeds.

alter table public.articles add constraint articles_url_key unique (url);

-- ---------------------------------------------------------------------------
-- Swap the trends list in a single transaction so readers never see it empty.

create function public.replace_trends(items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.trends where true;
  insert into public.trends (context, topic, posts_count, category, position)
  select
    item ->> 'context',
    item ->> 'topic',
    coalesce((item ->> 'posts_count')::integer, 0),
    item ->> 'category',
    (ordinality - 1)::integer
  from jsonb_array_elements(items) with ordinality as t (item, ordinality);
end;
$$;

revoke execute on function public.replace_trends(jsonb) from public, anon, authenticated;
grant execute on function public.replace_trends(jsonb) to service_role;
