-- Pulse: reader activity saved to each account.
-- Likes, bookmarks and follows were created in the init migration. This adds
-- reposts, followed topics and settings, and keeps the like, repost, view and
-- follower counts in sync the way comments_count already is.

-- ---------------------------------------------------------------------------
-- New tables

create table public.reposts (
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table public.topic_follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (
    category in ('world', 'politics', 'business', 'tech', 'science', 'health', 'sports', 'entertainment', 'climate')
  ),
  created_at timestamptz not null default now(),
  primary key (user_id, category)
);

-- One row per user, created the first time they change a setting.
-- Defaults match src/lib/settings.ts.
create table public.user_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  show_images boolean not null default true,
  show_breaking_banner boolean not null default true,
  autoplay_video boolean not null default false,
  hide_sensitive boolean not null default true,
  breaking_alerts boolean not null default true,
  daily_brief boolean not null default true,
  replies_and_mentions boolean not null default true,
  email_digest boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Counters

-- Keep articles.likes_count in sync.
create function public.sync_likes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set likes_count = likes_count + 1 where id = new.article_id;
  elsif tg_op = 'DELETE' then
    update public.articles set likes_count = greatest(likes_count - 1, 0) where id = old.article_id;
  end if;
  return null;
end;
$$;

create trigger likes_count_sync
  after insert or delete on public.likes
  for each row execute function public.sync_likes_count();

-- Keep articles.reposts_count in sync.
create function public.sync_reposts_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set reposts_count = reposts_count + 1 where id = new.article_id;
  elsif tg_op = 'DELETE' then
    update public.articles set reposts_count = greatest(reposts_count - 1, 0) where id = old.article_id;
  end if;
  return null;
end;
$$;

create trigger reposts_count_sync
  after insert or delete on public.reposts
  for each row execute function public.sync_reposts_count();

-- Keep sources.followers_count in sync.
create function public.sync_followers_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.sources set followers_count = followers_count + 1 where id = new.source_id;
  elsif tg_op = 'DELETE' then
    update public.sources set followers_count = greatest(followers_count - 1, 0) where id = old.source_id;
  end if;
  return null;
end;
$$;

create trigger followers_count_sync
  after insert or delete on public.follows
  for each row execute function public.sync_followers_count();

-- Count one view of a story. The app calls it when a story page opens, at most
-- once per story per day in each browser. Readers can't update articles
-- themselves, so this is the only way they change views_count.
create function public.record_article_view(article_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.articles set views_count = views_count + 1 where id = article_id;
$$;

revoke execute on function public.record_article_view(uuid) from public;
grant execute on function public.record_article_view(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row level security: each reader sees and changes only their own rows.

alter table public.reposts enable row level security;
alter table public.topic_follows enable row level security;
alter table public.user_settings enable row level security;

create policy "Users read their own reposts" on public.reposts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users repost as themselves" on public.reposts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove their own reposts" on public.reposts
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own topics" on public.topic_follows
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users follow topics as themselves" on public.topic_follows
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users unfollow their own topics" on public.topic_follows
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own settings" on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users create their own settings" on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users change their own settings" on public.user_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
