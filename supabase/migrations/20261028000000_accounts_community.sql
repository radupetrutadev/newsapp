-- Pulse: accounts and community.
-- Readers can edit their profile and upload a photo (the avatars bucket) and
-- delete their account. Replies form threads under the comment that started
-- them, and readers can delete their own and report anyone else's; enough
-- reports hide one. Triggers limit how fast anyone can post or report.
-- Stories can carry a video and a sensitive-content flag, which the reader's
-- autoplay and sensitive-content settings act on.
--
-- Safe to run more than once: a run that stopped partway can simply be
-- run again.

-- ---------------------------------------------------------------------------
-- Profiles: names, bios and photos

-- Profiles from before these limits are brought within them first: long
-- names are cut (blank ones become the handle) and photos that aren't on
-- https, which next/image can't show, are dropped.
update public.profiles
set display_name = left(coalesce(nullif(btrim(display_name), ''), handle), 50)
where char_length(btrim(display_name)) not between 1 and 50;
update public.profiles set bio = left(bio, 160) where char_length(bio) > 160;
update public.profiles
set avatar_url = null
where avatar_url !~ '^https://' or char_length(avatar_url) > 2048;

alter table public.profiles drop constraint if exists profiles_display_name_length;
alter table public.profiles add constraint profiles_display_name_length
  check (char_length(btrim(display_name)) between 1 and 50);

alter table public.profiles drop constraint if exists profiles_bio_length;
alter table public.profiles add constraint profiles_bio_length
  check (char_length(bio) <= 160);

alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or (avatar_url ~ '^https://' and char_length(avatar_url) <= 2048));

-- Sign-up keeps names (from the form or a provider) within the new limit.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_handle text;
  avatar text := new.raw_user_meta_data ->> 'avatar_url';
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
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        base_handle
      ),
      50
    ),
    case when avatar ~ '^https://' and char_length(avatar) <= 2048 then avatar end
  );
  return new;
end;
$$;

-- Profile photos: public to read, written only into the reader's own folder
-- (avatars/<user id>/...). The app resizes photos before uploading them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Readers see their own photos" on storage.objects;
create policy "Readers see their own photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Readers upload their own photos" on storage.objects;
create policy "Readers upload their own photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Readers delete their own photos" on storage.objects;
create policy "Readers delete their own photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Threads, deleted replies and hidden replies
--
-- root_id is the comment that started a reply's thread (null on that comment
-- itself), so a story's replies load as threads. A deleted reply that others
-- answered stays as a placeholder (deleted_at, with no text or author) so
-- the thread still reads in order; placeholders nobody answers any more are
-- removed. hidden_at is set once enough readers report a reply.

alter table public.comments
  add column if not exists root_id uuid references public.comments (id) on delete set null;
alter table public.comments add column if not exists deleted_at timestamptz;
alter table public.comments add column if not exists hidden_at timestamptz;

-- Placeholders have no author, so a deleted account's answered replies can
-- stay in their threads.
alter table public.comments alter column user_id drop not null;
alter table public.comments drop constraint if exists comments_user_id_fkey;
alter table public.comments add constraint comments_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

alter table public.comments drop constraint if exists comments_body_check;
alter table public.comments add constraint comments_body_check check (
  case
    when deleted_at is null then user_id is not null and char_length(body) between 1 and 280
    else body = '' and user_id is null
  end
);

create index if not exists comments_root_idx on public.comments (root_id, created_at) where root_id is not null;
create index if not exists comments_parent_idx on public.comments (parent_id) where parent_id is not null;
create index if not exists comments_user_idx on public.comments (user_id, created_at desc);
create index if not exists comments_deleted_idx on public.comments (id) where deleted_at is not null;

-- Replies posted before this migration join their threads.
with recursive thread as (
  select c.id, c.id as root
  from public.comments c
  where c.parent_id is null
  union all
  select c.id, t.root
  from public.comments c
  join thread t on c.parent_id = t.id
)
update public.comments c
set root_id = t.root
from thread t
where c.id = t.id and c.parent_id is not null and c.root_id is distinct from t.root;

-- A reply answers a comment on the same story that's still there, and joins
-- that comment's thread.
create or replace function public.check_comment_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent public.comments;
begin
  new.root_id := null;
  if new.parent_id is null then
    return new;
  end if;

  select * into parent from public.comments c where c.id = new.parent_id;
  if parent.id is null or parent.article_id <> new.article_id then
    raise exception 'A reply must answer a comment on the same story.' using errcode = '23503';
  end if;
  if parent.deleted_at is not null or parent.hidden_at is not null then
    raise exception 'That reply was removed, so it can''t be answered.' using errcode = 'PT409';
  end if;
  new.root_id := coalesce(parent.root_id, parent.id);
  return new;
end;
$$;

-- articles.comments_count counts the replies people can read.
create or replace function public.sync_comments_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := 0;
  story uuid;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    delta := delta + (new.deleted_at is null and new.hidden_at is null)::integer;
    story := new.article_id;
  end if;
  if tg_op in ('DELETE', 'UPDATE') then
    delta := delta - (old.deleted_at is null and old.hidden_at is null)::integer;
    story := old.article_id;
  end if;
  if delta <> 0 then
    update public.articles set comments_count = greatest(comments_count + delta, 0) where id = story;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_count_sync on public.comments;
create trigger comments_count_sync
  after insert or delete or update of deleted_at, hidden_at on public.comments
  for each row execute function public.sync_comments_count();

-- A removed reply takes its notifications with it, and a deleted one its
-- likes too. (A hidden one keeps them, in case it's shown again.)
create or replace function public.on_comment_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications n where n.comment_id = new.id;
  if new.deleted_at is not null then
    delete from public.comment_likes l where l.comment_id = new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists comments_removed on public.comments;
create trigger comments_removed
  after update of deleted_at, hidden_at on public.comments
  for each row
  when (old.deleted_at is null and old.hidden_at is null and (new.deleted_at is not null or new.hidden_at is not null))
  execute function public.on_comment_removed();

-- Removes placeholders that no reply answers any more (repeatedly, since
-- removing one can leave the placeholder it answered unanswered).
create or replace function public.prune_deleted_comments()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  loop
    delete from public.comments c
    where c.deleted_at is not null
      and not exists (select 1 from public.comments r where r.parent_id = c.id);
    exit when not found;
  end loop;
end;
$$;

-- Deletes one of the signed-in reader's replies. One that others answered
-- becomes a placeholder.
create or replace function public.delete_comment(comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reader uuid := (select auth.uid());
begin
  if reader is null then
    raise exception 'Sign in to delete replies.' using errcode = '42501';
  end if;

  -- Locked first, so a reply arriving at the same moment either is seen
  -- here or waits and then finds the comment gone.
  perform 1 from public.comments c
  where c.id = delete_comment.comment_id and c.user_id = reader and c.deleted_at is null
  for update;
  if not found then
    raise exception 'That reply was already deleted.' using errcode = 'PT404';
  end if;

  if exists (select 1 from public.comments r where r.parent_id = delete_comment.comment_id) then
    update public.comments c
    set deleted_at = now(), body = '', user_id = null
    where c.id = delete_comment.comment_id;
  else
    delete from public.comments c where c.id = delete_comment.comment_id;
    perform public.prune_deleted_comments();
  end if;
end;
$$;

-- Readers delete replies with delete_comment, so answered ones keep their
-- place in the thread.
drop policy if exists "Users delete their own comments" on public.comments;
revoke delete on public.comments from anon, authenticated;

-- Removed replies can't be liked.
drop policy if exists "Users like comments as themselves" on public.comment_likes;
create policy "Users like comments as themselves" on public.comment_likes
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.comments c
      where c.id = comment_id and c.deleted_at is null and c.hidden_at is null
    )
  );

-- A deleted account's replies go too, except those others answered, which
-- become placeholders. Runs before the profile row goes (it is removed along
-- with its auth.users row).
create or replace function public.before_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.comments c
  set deleted_at = coalesce(c.deleted_at, now()), body = '', user_id = null
  where c.user_id = old.id;
  perform public.prune_deleted_comments();
  return old;
end;
$$;

drop trigger if exists profiles_before_delete on public.profiles;
create trigger profiles_before_delete
  before delete on public.profiles
  for each row execute function public.before_profile_delete();

-- ---------------------------------------------------------------------------
-- Reports: one per reader per reply. Three readers' reports hide a reply
-- until someone reviews it (see the README for the queries).

create table if not exists public.comment_reports (
  comment_id uuid not null references public.comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'misinformation', 'other')),
  created_at timestamptz not null default now(),
  primary key (comment_id, reporter_id)
);

create index if not exists comment_reports_reporter_idx on public.comment_reports (reporter_id, created_at desc);

create or replace function public.check_comment_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reported public.comments;
begin
  select * into reported from public.comments c where c.id = new.comment_id;
  if reported.id is null or reported.deleted_at is not null then
    raise exception 'That reply was already deleted.' using errcode = 'PT404';
  end if;
  if reported.user_id = new.reporter_id then
    raise exception 'You can''t report your own reply.' using errcode = 'PT422';
  end if;
  if (
    select count(*) from public.comment_reports r
    where r.reporter_id = new.reporter_id and r.created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'You''ve sent a lot of reports in the last hour. Try again later.' using errcode = 'PT429';
  end if;
  return new;
end;
$$;

drop trigger if exists comment_reports_check on public.comment_reports;
create trigger comment_reports_check
  before insert on public.comment_reports
  for each row execute function public.check_comment_report();

create or replace function public.on_comment_report()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.comments c
  set hidden_at = now()
  where c.id = new.comment_id
    and c.hidden_at is null
    and (select count(*) from public.comment_reports r where r.comment_id = new.comment_id) >= 3;
  return null;
end;
$$;

drop trigger if exists comment_reports_hide on public.comment_reports;
create trigger comment_reports_hide
  after insert on public.comment_reports
  for each row execute function public.on_comment_report();

-- ---------------------------------------------------------------------------
-- Spam limits for replies: five a minute, thirty an hour, two links each,
-- and not the same text twice on one story in a day. Trusted code (the
-- service role, the SQL editor) isn't limited.

create or replace function public.limit_comments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent integer;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  select count(*) into recent
  from public.comments c
  where c.user_id = new.user_id and c.created_at > now() - interval '1 hour';
  if recent >= 30 then
    raise exception 'You''ve posted a lot of replies in the last hour. Try again later.' using errcode = 'PT429';
  end if;
  if (
    select count(*) from public.comments c
    where c.user_id = new.user_id and c.created_at > now() - interval '1 minute'
  ) >= 5 then
    raise exception 'You''re replying too fast. Wait a minute and try again.' using errcode = 'PT429';
  end if;

  if (select count(*) from regexp_matches(new.body, '(https?://|www\.)', 'gi')) > 2 then
    raise exception 'Replies can include up to two links.' using errcode = 'PT422';
  end if;

  if exists (
    select 1 from public.comments c
    where c.user_id = new.user_id
      and c.article_id = new.article_id
      and c.created_at > now() - interval '1 day'
      and lower(btrim(c.body)) = lower(btrim(new.body))
  ) then
    raise exception 'You already posted that reply.' using errcode = 'PT409';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_limit on public.comments;
create trigger comments_limit
  before insert on public.comments
  for each row execute function public.limit_comments();

-- ---------------------------------------------------------------------------
-- Video and sensitive stories

alter table public.articles add column if not exists video_url text;
alter table public.articles add column if not exists is_sensitive boolean not null default false;

alter table public.articles drop constraint if exists articles_video_url_check;
alter table public.articles add constraint articles_video_url_check
  check (video_url is null or (video_url ~ '^https://' and char_length(video_url) <= 2048));

-- ---------------------------------------------------------------------------
-- Row level security and function access

alter table public.comment_reports enable row level security;

drop policy if exists "Users read their own reports" on public.comment_reports;
create policy "Users read their own reports" on public.comment_reports
  for select to authenticated using ((select auth.uid()) = reporter_id);
drop policy if exists "Users report as themselves" on public.comment_reports;
create policy "Users report as themselves" on public.comment_reports
  for insert to authenticated with check ((select auth.uid()) = reporter_id);

revoke insert, update, delete on public.comment_reports from anon, authenticated;
grant insert (comment_id, reporter_id, reason) on public.comment_reports to authenticated;

revoke execute on function public.prune_deleted_comments() from public, anon, authenticated;
revoke execute on function public.delete_comment(uuid) from public, anon;
grant execute on function public.delete_comment(uuid) to authenticated;
