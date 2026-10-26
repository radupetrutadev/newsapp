-- Pulse: notifications.
-- Readers can now reply to a comment, like comments and follow each other.
-- Those actions, and breaking stories from the sources and topics a reader
-- follows, add rows to public.notifications from triggers, so a write notifies
-- the same way whichever code makes it. The app lists them
-- (notifications_page), keeps the unread badge live, sends them as browser
-- push notifications (claim_push_notifications) and mails a weekly digest
-- (claim_digest_recipients).
--
-- Safe to run more than once: a run that stopped partway can simply be
-- run again.

-- ---------------------------------------------------------------------------
-- Replies to comments, comment likes and following people

alter table public.comments
  add column if not exists parent_id uuid references public.comments (id) on delete set null;

create table if not exists public.comment_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  comment_id uuid not null references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create index if not exists comment_likes_comment_idx on public.comment_likes (comment_id, created_at desc);

create table if not exists public.user_follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index if not exists user_follows_followee_idx on public.user_follows (followee_id, created_at desc);

alter table public.profiles add column if not exists followers_count integer not null default 0;

-- Readers write only these columns, so counts and badges stay with the
-- triggers. (Before this, a reader could also set their own `verified` flag.)
revoke insert, update on public.profiles from anon, authenticated;
grant update (handle, display_name, avatar_url, bio) on public.profiles to authenticated;

revoke insert, update on public.comments from anon, authenticated;
grant insert (article_id, user_id, body, parent_id) on public.comments to authenticated;

-- A reply answers a comment on the same story.
create or replace function public.check_comment_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_id is not null and not exists (
    select 1 from public.comments c where c.id = new.parent_id and c.article_id = new.article_id
  ) then
    raise exception 'A reply must answer a comment on the same story.' using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_check_parent on public.comments;
create trigger comments_check_parent
  before insert on public.comments
  for each row execute function public.check_comment_parent();

-- ---------------------------------------------------------------------------
-- Notifications: one row per item in a reader's list.
--
--   kind      what happened              comment_id                 actors
--   reply     someone replied to you     their reply                its author
--   mention   someone wrote @you         their comment              its author
--   like      people liked your comment  your comment               comment_likes
--   follow    people followed you        -                          user_follows
--   breaking  a followed source or topic -                          (the story's source)
--             broke a story
--
-- Likes on one comment, and new followers, gather in one unread row
-- (group_key). Who is in it is read from comment_likes or user_follows between
-- the row's created_at and read_at, so the count is exact and an unlike or
-- unfollow takes the person out again.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('reply', 'mention', 'like', 'follow', 'breaking')),
  group_key text,
  comment_id uuid references public.comments (id) on delete cascade,
  article_id uuid references public.articles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- When someone last joined the row; the list is ordered by it.
  updated_at timestamptz not null default now(),
  read_at timestamptz,
  -- Set once the row has been handed to the push sender.
  pushed_at timestamptz
);

create index if not exists notifications_user_idx on public.notifications (user_id, updated_at desc, id desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;
create unique index if not exists notifications_group_idx on public.notifications (user_id, group_key) where read_at is null;
create index if not exists notifications_unpushed_idx on public.notifications (updated_at) where pushed_at is null;

-- Settings rows exist once a reader changes something; until then the
-- defaults (on) apply. Likes and follows have no setting.
create or replace function public.wants_notification(recipient uuid, kind text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case
        when kind in ('reply', 'mention') then s.replies_and_mentions
        when kind = 'breaking' then s.breaking_alerts
        else true
      end
      from public.user_settings s
      where s.user_id = recipient
    ),
    true
  )
$$;

-- Adds someone to a reader's unread like or follow row, creating it if needed.
create or replace function public.notify_group(recipient uuid, kind text, group_key text, comment_id uuid, article_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, kind, group_key, comment_id, article_id)
  values (recipient, kind, group_key, comment_id, article_id)
  on conflict (user_id, group_key) where read_at is null
  do update set updated_at = now(), pushed_at = null;
$$;

-- Replies and @mentions.
create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_author uuid;
begin
  if new.parent_id is not null then
    select c.user_id into parent_author from public.comments c where c.id = new.parent_id;
    if parent_author <> new.user_id and public.wants_notification(parent_author, 'reply') then
      insert into public.notifications (user_id, kind, comment_id, article_id)
      values (parent_author, 'reply', new.id, new.article_id);
    end if;
  end if;

  -- The person replied to already hears about it.
  insert into public.notifications (user_id, kind, comment_id, article_id)
  select p.id, 'mention', new.id, new.article_id
  from public.profiles p
  where p.handle in (
      select lower(m[1])
      from regexp_matches(new.body, '(?<![A-Za-z0-9_])@([A-Za-z0-9_]{3,15})(?![A-Za-z0-9_])', 'g') as m
      limit 10
    )
    and p.id <> new.user_id
    and p.id is distinct from parent_author
    and public.wants_notification(p.id, 'mention');
  return null;
end;
$$;

drop trigger if exists comments_notify on public.comments;
create trigger comments_notify
  after insert on public.comments
  for each row execute function public.notify_comment();

-- Keeps comments.likes_count in sync and tells the comment's author.
create or replace function public.on_comment_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
  story uuid;
begin
  if tg_op = 'INSERT' then
    update public.comments set likes_count = likes_count + 1
    where id = new.comment_id
    returning user_id, article_id into author, story;
    if author <> new.user_id then
      perform public.notify_group(author, 'like', 'like:' || new.comment_id, new.comment_id, story);
    end if;
  else
    update public.comments set likes_count = greatest(likes_count - 1, 0)
    where id = old.comment_id
    returning user_id into author;
    -- Rows nobody is left in disappear.
    delete from public.notifications n
    where n.user_id = author
      and n.group_key = 'like:' || old.comment_id
      and not exists (
        select 1 from public.comment_likes l
        where l.comment_id = old.comment_id
          and l.user_id <> n.user_id
          and l.created_at between n.created_at and coalesce(n.read_at, 'infinity')
      );
  end if;
  return null;
end;
$$;

drop trigger if exists comment_likes_sync on public.comment_likes;
create trigger comment_likes_sync
  after insert or delete on public.comment_likes
  for each row execute function public.on_comment_like();

-- Keeps profiles.followers_count in sync and tells the person followed.
create or replace function public.on_user_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles set followers_count = followers_count + 1 where id = new.followee_id;
    perform public.notify_group(new.followee_id, 'follow', 'follow', null, null);
  else
    update public.profiles set followers_count = greatest(followers_count - 1, 0) where id = old.followee_id;
    delete from public.notifications n
    where n.user_id = old.followee_id
      and n.group_key = 'follow'
      and not exists (
        select 1 from public.user_follows f
        where f.followee_id = n.user_id
          and f.created_at between n.created_at and coalesce(n.read_at, 'infinity')
      );
  end if;
  return null;
end;
$$;

drop trigger if exists user_follows_sync on public.user_follows;
create trigger user_follows_sync
  after insert or delete on public.user_follows
  for each row execute function public.on_user_follow();

-- Breaking stories, for everyone who follows the source or the topic. Older
-- stories (a feed catching up) don't alert anyone.
create or replace function public.notify_breaking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, kind, article_id)
  select r.user_id, 'breaking', new.id
  from (
    select f.user_id from public.follows f where f.source_id = new.source_id
    union
    select t.user_id from public.topic_follows t where t.category = new.category
  ) as r
  where public.wants_notification(r.user_id, 'breaking');
  return null;
end;
$$;

drop trigger if exists articles_notify_breaking on public.articles;
create trigger articles_notify_breaking
  after insert on public.articles
  for each row
  when (new.is_breaking and new.published_at > now() - interval '6 hours')
  execute function public.notify_breaking();

-- ---------------------------------------------------------------------------
-- Reading notifications

-- One row as the app shows it: who (the newest three, and how many), the
-- comment and story it is about, and for breaking news the source.
create or replace function public.notification_json(n public.notifications)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with actors as (
    select p.handle, p.display_name, p.avatar_url, x.at
    from (
      select c.user_id, c.created_at as at
      from public.comments c
      where n.kind in ('reply', 'mention') and c.id = n.comment_id
      union all
      select l.user_id, l.created_at
      from public.comment_likes l
      where n.kind = 'like'
        and l.comment_id = n.comment_id
        and l.user_id <> n.user_id
        and l.created_at between n.created_at and coalesce(n.read_at, 'infinity')
      union all
      select f.follower_id, f.created_at
      from public.user_follows f
      where n.kind = 'follow'
        and f.followee_id = n.user_id
        and f.created_at between n.created_at and coalesce(n.read_at, 'infinity')
    ) as x
    join public.profiles p on p.id = x.user_id
  )
  select jsonb_build_object(
    'id', n.id,
    'kind', n.kind,
    'created_at', n.created_at,
    'updated_at', n.updated_at,
    'unread', n.read_at is null,
    'actors_count', (select count(*) from actors),
    'actors', coalesce(
      (
        select jsonb_agg(to_jsonb(newest) - 'at' order by newest.at desc)
        from (select * from actors order by at desc limit 3) as newest
      ),
      '[]'
    ),
    'comment', (
      select jsonb_build_object('id', c.id, 'body', c.body) from public.comments c where c.id = n.comment_id
    ),
    'article', (
      select jsonb_build_object('slug', a.slug, 'title', a.title) from public.articles a where a.id = n.article_id
    ),
    'source', (
      select jsonb_build_object('handle', s.handle, 'name', s.name, 'color', s.color, 'logo_url', s.logo_url)
      from public.articles a
      join public.sources s on s.id = a.source_id
      where n.kind = 'breaking' and a.id = n.article_id
    )
  )
$$;

-- The signed-in reader's notifications, newest activity first, one page at a
-- time. `filter` is 'all', 'breaking' or 'mentions' (replies and mentions).
create or replace function public.notifications_page(
  page_size integer,
  filter text default 'all',
  before_at timestamptz default null,
  before_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      public.notification_json(page.notification)
      order by (page.notification).updated_at desc, (page.notification).id desc
    ),
    '[]'
  )
  from (
    select n as notification
    from public.notifications n
    where n.user_id = (select auth.uid())
      and case notifications_page.filter
        when 'breaking' then n.kind = 'breaking'
        when 'mentions' then n.kind in ('reply', 'mention')
        else true
      end
      and (n.updated_at, n.id) < (
        coalesce(before_at, 'infinity'),
        coalesce(before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff')
      )
    order by n.updated_at desc, n.id desc
    limit least(greatest(page_size, 0), 100)
  ) as page
$$;

-- Marks what the reader has seen as read: everything last updated by `up_to`
-- (the newest item they were shown). Anything newer stays unread.
create or replace function public.mark_notifications_read(up_to timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications
  set read_at = now()
  where user_id = (select auth.uid()) and read_at is null and updated_at <= up_to;
$$;

-- ---------------------------------------------------------------------------
-- Browser push: one row per browser that turned push on.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 2048),
  p256dh text not null check (length(p256dh) <= 256),
  auth_key text not null check (length(auth_key) <= 256),
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id, created_at desc);

-- Saves this browser for the signed-in reader. A browser belongs to whoever
-- signed in on it last, and each reader keeps their ten newest browsers.
create or replace function public.save_push_subscription(endpoint text, p256dh text, auth_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reader uuid := (select auth.uid());
begin
  if reader is null then
    raise exception 'Sign in to turn on push notifications.' using errcode = '42501';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
  values (reader, save_push_subscription.endpoint, save_push_subscription.p256dh, save_push_subscription.auth_key)
  on conflict on constraint push_subscriptions_endpoint_key do update
  set user_id = excluded.user_id, p256dh = excluded.p256dh, auth_key = excluded.auth_key, created_at = now();

  delete from public.push_subscriptions s
  where s.user_id = reader
    and s.id not in (
      select k.id from public.push_subscriptions k where k.user_id = reader order by k.created_at desc limit 10
    );
end;
$$;

-- For the push sender (service role): marks every notification not yet
-- handed over as handed over, and returns those worth sending now, with the
-- reader's id. Readers without push, and anything over an hour old, are skipped.
create or replace function public.claim_push_notifications(max_count integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  with claimed as (
    update public.notifications n
    set pushed_at = now()
    where n.id in (
      select p.id
      from public.notifications p
      where p.pushed_at is null
      order by p.updated_at
      limit max_count
      for update skip locked
    )
    returning n
  )
  select coalesce(
    jsonb_agg(public.notification_json(c.n) || jsonb_build_object('user_id', (c.n).user_id)),
    '[]'
  )
  into result
  from claimed c
  where (c.n).updated_at > now() - interval '1 hour'
    and exists (select 1 from public.push_subscriptions s where s.user_id = (c.n).user_id);
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Weekly email digest: which readers have been sent which week's email.

create table if not exists public.email_digests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  week date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, week)
);

-- For the digest sender (service role): claims up to `max_count` readers with
-- the digest on who haven't been claimed for `digest_week`, and returns their
-- email addresses. A failed send deletes its claims so a retry picks them up.
create or replace function public.claim_digest_recipients(digest_week date, max_count integer default 100)
returns table (user_id uuid, email text, display_name text)
language sql
security definer
set search_path = ''
as $$
  with candidates as (
    select s.user_id
    from public.user_settings s
    where s.email_digest
      and not exists (
        select 1 from public.email_digests d where d.user_id = s.user_id and d.week = digest_week
      )
    order by s.user_id
    limit max_count
  ),
  claimed as (
    insert into public.email_digests (user_id, week)
    select c.user_id, digest_week from candidates c
    on conflict do nothing
    returning email_digests.user_id
  )
  select c.user_id, u.email::text, p.display_name
  from claimed c
  join auth.users u on u.id = c.user_id
  join public.profiles p on p.id = c.user_id
  where u.email is not null
$$;

-- ---------------------------------------------------------------------------
-- Row level security and function access

alter table public.comment_likes enable row level security;
alter table public.user_follows enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
-- Service role only: no policies.
alter table public.email_digests enable row level security;

drop policy if exists "Users read their own comment likes" on public.comment_likes;
create policy "Users read their own comment likes" on public.comment_likes
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users like comments as themselves" on public.comment_likes;
create policy "Users like comments as themselves" on public.comment_likes
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users remove their own comment likes" on public.comment_likes;
create policy "Users remove their own comment likes" on public.comment_likes
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users read who they follow" on public.user_follows;
create policy "Users read who they follow" on public.user_follows
  for select to authenticated using ((select auth.uid()) = follower_id);
drop policy if exists "Users follow people as themselves" on public.user_follows;
create policy "Users follow people as themselves" on public.user_follows
  for insert to authenticated with check ((select auth.uid()) = follower_id);
drop policy if exists "Users unfollow people as themselves" on public.user_follows;
create policy "Users unfollow people as themselves" on public.user_follows
  for delete to authenticated using ((select auth.uid()) = follower_id);

-- Read-only: rows come from the triggers and are marked read with
-- mark_notifications_read.
drop policy if exists "Users read their own notifications" on public.notifications;
create policy "Users read their own notifications" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);

-- Saved with save_push_subscription.
drop policy if exists "Users read their own push subscriptions" on public.push_subscriptions;
create policy "Users read their own push subscriptions" on public.push_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users remove their own push subscriptions" on public.push_subscriptions;
create policy "Users remove their own push subscriptions" on public.push_subscriptions
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke execute on function public.wants_notification(uuid, text) from public, anon, authenticated;
revoke execute on function public.notify_group(uuid, text, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.notification_json(public.notifications) from public, anon, authenticated;

revoke execute on function public.notifications_page(integer, text, timestamptz, uuid) from public, anon;
revoke execute on function public.mark_notifications_read(timestamptz) from public, anon;
revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.notifications_page(integer, text, timestamptz, uuid) to authenticated;
grant execute on function public.mark_notifications_read(timestamptz) to authenticated;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

revoke execute on function public.claim_push_notifications(integer) from public, anon, authenticated;
revoke execute on function public.claim_digest_recipients(date, integer) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(integer) to service_role;
grant execute on function public.claim_digest_recipients(date, integer) to service_role;
