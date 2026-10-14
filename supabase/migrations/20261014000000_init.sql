-- Pulse: initial schema.
-- Public content (sources, articles, trends) is readable by everyone.
-- User data (profiles, comments, likes, bookmarks, follows) is protected by RLS.

-- ---------------------------------------------------------------------------
-- Publishers

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique check (handle ~ '^[a-z0-9_]{2,30}$'),
  name text not null,
  description text not null default '',
  website text,
  category text not null,
  color text not null default '#1d9bf0',
  logo_url text,
  verified boolean not null default false,
  followers_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Articles

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  source_id uuid not null references public.sources (id) on delete cascade,
  title text not null,
  summary text not null,
  body text[] not null default '{}',
  image_url text,
  url text,
  category text not null,
  tags text[] not null default '{}',
  is_breaking boolean not null default false,
  read_time_minutes integer not null default 3,
  comments_count integer not null default 0,
  reposts_count integer not null default 0,
  likes_count integer not null default 0,
  views_count integer not null default 0,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index articles_published_at_idx on public.articles (published_at desc);
create index articles_category_published_at_idx on public.articles (category, published_at desc);
create index articles_source_published_at_idx on public.articles (source_id, published_at desc);

-- ---------------------------------------------------------------------------
-- Trending topics (curated or computed by a scheduled job)

create table public.trends (
  id uuid primary key default gen_random_uuid(),
  context text not null,
  topic text not null,
  posts_count integer not null default 0,
  category text not null,
  position integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Profiles: one per auth user, created automatically on sign-up.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9_]{3,15}$'),
  display_name text not null,
  avatar_url text,
  bio text not null default '',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_handle text;
begin
  base_handle := lower(regexp_replace(
    coalesce(new.raw_user_meta_data ->> 'handle', split_part(new.email, '@', 1), 'reader'),
    '[^a-zA-Z0-9_]', '', 'g'
  ));
  if length(base_handle) < 3 then
    base_handle := base_handle || 'reader';
  end if;
  base_handle := left(base_handle, 15);

  -- Fall back to a suffixed handle if the requested one is taken.
  if exists (select 1 from public.profiles where handle = base_handle) then
    base_handle := left(base_handle, 10) || '_' || substr(replace(new.id::text, '-', ''), 1, 4);
  end if;

  insert into public.profiles (id, handle, display_name, avatar_url)
  values (
    new.id,
    base_handle,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      base_handle
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Engagement

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  likes_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index comments_article_idx on public.comments (article_id, created_at desc);

create table public.likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table public.bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  article_id uuid not null references public.articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table public.follows (
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_id uuid not null references public.sources (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

-- Keep articles.comments_count in sync.
create function public.sync_comments_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.articles set comments_count = comments_count + 1 where id = new.article_id;
  elsif tg_op = 'DELETE' then
    update public.articles set comments_count = greatest(comments_count - 1, 0) where id = old.article_id;
  end if;
  return null;
end;
$$;

create trigger comments_count_sync
  after insert or delete on public.comments
  for each row execute function public.sync_comments_count();

-- ---------------------------------------------------------------------------
-- Row level security

alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.trends enable row level security;
alter table public.profiles enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.bookmarks enable row level security;
alter table public.follows enable row level security;

create policy "Sources are public" on public.sources for select using (true);
create policy "Articles are public" on public.articles for select using (true);
create policy "Trends are public" on public.trends for select using (true);

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Comments are public" on public.comments for select using (true);
create policy "Users write their own comments" on public.comments
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users delete their own comments" on public.comments
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users read their own likes" on public.likes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users like as themselves" on public.likes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove their own likes" on public.likes
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own bookmarks" on public.bookmarks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users bookmark as themselves" on public.bookmarks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users remove their own bookmarks" on public.bookmarks
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users read their own follows" on public.follows
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users follow as themselves" on public.follows
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users unfollow as themselves" on public.follows
  for delete to authenticated using ((select auth.uid()) = user_id);
