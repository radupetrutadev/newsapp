# Pulse — a real-time news feed

A news app with an X (Twitter)-style interface, dark mode only. Built with **Next.js 16 (App Router, Cache Components)**, **TypeScript**, **Tailwind CSS v4** and **Supabase**.

It runs out of the box on mock data ("demo mode"). Add Supabase keys and the same UI reads from your database, enables real accounts, and fills the feed with real stories from publishers' RSS feeds.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No configuration is needed for demo mode.

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests in demo mode (Playwright; see [Tests and CI](#tests-and-ci)) |
| `npm run test:e2e:supabase` | End-to-end tests against a local Supabase stack (needs Docker) |
| `npm run ingest` | Fetch all RSS feeds once, on a running server (see [News ingestion](#news-ingestion)) |
| `npm run db:seed:generate` | Regenerate `supabase/seed.sql` from the mock data (Node 22.18+) |

## Pages

| Route | Page |
| --- | --- |
| `/` | **Feed** — ranked "For you" and "Following" tabs with infinite scroll, topic chips, live breaking banner |
| `/article/[slug]` | Story — full article (and video), engagement stats, threaded replies, related stories |
| `/explore` | Search, most-read hero, top stories carousel, trends, topics, sources |
| `/search?q=` | Search results for stories and sources |
| `/notifications` | Replies, mentions, likes, new followers and breaking news: All / Breaking / Mentions |
| `/bookmarks` | Saved stories |
| `/topics`, `/topics/[slug]` | Follow topics; per-topic feed |
| `/source/[handle]` | Publisher profile (banner, bio, follow, Latest / Top) |
| `/profile` | Your profile — likes, reposts, sources and people you follow |
| `/profile/edit` | Edit your name, bio and photo |
| `/user/[handle]` | A reader's page — follow them, see their replies |
| `/settings` | Account (edit profile, change password, delete account), feed, notification and display preferences |
| `/login`, `/signup` | Email/password and Google/GitHub sign-in via Supabase Auth |
| `/forgot-password`, `/reset-password` | Email a reset link; choose a new password (also reached from Settings) |
| `/unsubscribe` | Where the link in the weekly digest email goes |
| `/about`, `/terms`, `/privacy` | Static pages (Terms and Privacy are placeholders) |

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations in order in the SQL editor (or `supabase db push` with the Supabase CLI):
   - `supabase/migrations/20261014000000_init.sql` — tables, indexes, RLS policies, a trigger that creates a profile for each new user, and a trigger that keeps comment counts in sync.
   - `supabase/migrations/20261019000000_feeds.sql` — the `feeds` table, one row per story URL, and the function that refreshes trends.
   - `supabase/migrations/20261024000000_activity.sql` — reposts, followed topics and settings tables, triggers that keep like, repost and follower counts in sync, and the story view counter.
   - `supabase/migrations/20261026000000_feeds_search.sql` — paging indexes, full-text search, and the functions behind "For you", "Following" and search results. See [Feeds and search](#feeds-and-search).
   - `supabase/migrations/20261027000000_notifications.sql` — replies to comments, comment likes, following people, notifications and the triggers that create them, push subscriptions and digest records. See [Notifications](#notifications). Safe to run again if a run stopped partway.
   - `supabase/migrations/20261028000000_accounts_community.sql` — profile limits and the `avatars` storage bucket, reply threads, deleting and reporting replies, spam limits, account deletion clean-up, and video and sensitive-content columns on stories. See [Accounts and community](#accounts-and-community). Safe to run again if a run stopped partway.

   Run each new migration **before** deploying the code that needs it. The build prerenders pages that read the database, so a build against a database without the migration fails; on Vercel the live site keeps running the previous deploy until a build succeeds.
3. Load content — pick one:
   - **Real news:** run `supabase/feeds.sql` (12 publishers, 28 RSS feeds), then set up [news ingestion](#news-ingestion).
   - **Demo content:** run `supabase/seed.sql` for the fictional stories from demo mode. Don't mix it with real news in production.
4. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works.
5. Under Authentication → URL Configuration, add `http://localhost:3000/**` and your production URL followed by `/**` to the Redirect URLs. Sign-in links, OAuth and password-reset links return to `/auth/callback` (reset links with `?next=/reset-password`). For OAuth, also enable Google and/or GitHub under Authentication → Providers.

Restart `npm run dev` after changing env vars.

### What uses Supabase today

- **Reads:** feeds, search, articles, sources, trends and comments (`src/lib/data`). Public reads use a cookie-free client inside `"use cache"` functions, so pages are prerendered and revalidate every minute.
- **Auth:** sign in, sign up, OAuth, sign out, password reset and change (`src/lib/actions/auth.ts`); the session is refreshed in `src/proxy.ts`. Deleting an account uses the secret key (`src/lib/actions/account.ts`).
- **Storage:** profile photos in the `avatars` bucket (`src/lib/actions/account.ts`).
- **Writes:** profiles (`src/lib/actions/account.ts`); replies, deleting and reporting them (`src/lib/actions/comments.ts`); likes, reposts, bookmarks, comment likes, followed sources, topics and people, settings and story views (`src/lib/actions/activity.ts`); notifications read and push subscriptions (`src/lib/actions/notifications.ts`, `push.ts`); stories and trends from news ingestion (`src/lib/ingest`).

### Reader activity

- Likes, reposts, bookmarks, follows and settings are saved to the reader's account. They load once per page visit (`src/components/layout/activity-sync.tsx`) into the client stores in `src/lib/store`.
- Buttons update straight away and undo themselves, with a message, if saving fails. Signed-out readers are asked to sign in.
- Like, repost and follower counts are kept up to date by database triggers. Pages are cached for about a minute, so the app adds the reader's own recent changes to cached counts until the cache catches up.
- A story view is counted when its page opens, at most once per day per browser. Views aren't protected against someone deliberately calling the counter over and over.
- In demo mode, all of this stays in the browser's `localStorage`, as before. Notifications come from `src/lib/mock` and count as read once you open Notifications.

### Feeds and search

Feeds load 20 stories at a time. The server renders the first page; more load from `/api/feed` as the reader scrolls (`src/lib/data/feeds.ts`, `src/components/feed/feed-list.tsx`). This covers the home feed, topic and source pages, and search results.

- **For you:** the newest 1,000 stories, ranked in the database. Newer stories rank higher. Likes, reposts, replies and reads lift a story, with diminishing returns. Stories in topics the reader follows count double. Later pages are ranked as of when the first one loaded, so new stories don't push others around while the reader scrolls. Readers who follow the same topics share cached pages.
- **Following:** stories from the sources the reader follows, newest first, read from their `follows` rows in one query. Signed-out readers are asked to follow sources.
- **Search:** Postgres full-text search over the headline, tags, summary and topic, with English word forms ("deals" finds "deal"). Every word must match. Words of four letters or more also match longer words ("clim" finds "climate"). Headline matches count most, and newer stories rank higher. Sources are matched by name, handle and description.
- **Paging:** newest-first lists continue after the last story shown, so a page never repeats or skips a story, even when new ones arrive. Ranked lists stop after 2,000 stories.
- **Demo mode:** the same feeds over the mock stories, with the same ranking (`src/lib/ranking.ts`). Follows stay in the browser and are sent with each request.

## Accounts and community

### Profiles

- **Edit profile** (`/profile/edit`, from your profile or Settings): name (up to 50 characters), bio (up to 160) and photo. The browser crops a photo to a square and shrinks it to 400 × 400 before uploading, so any JPG, PNG, WebP (or other image the browser can open) works. The server checks the file really is a JPG, PNG or WebP.
- Photos go to the public `avatars` bucket in Supabase Storage, which the migration creates, in a folder per reader (`avatars/<user id>/`). Storage policies let readers write only to their own folder. Older photos are removed when a new one is saved. Photo URLs must be `https://`, as `next/image` only loads those; a local Supabase on plain `http://` can't save photos.
- Readers' public pages are at `/user/<handle>`, with their replies; comment authors link there.

### Passwords and deleting an account

- **Forgot password** (`/forgot-password`, linked from sign in) emails a reset link. The page gives the same answer whether or not an account uses the address. The link signs the reader in and opens `/reset-password`, where they choose a new password; signed-in readers can open it from Settings → Password.
- Reset links use a one-time code tied to the browser that asked for them. To make them work on another device too, change the **Reset password** email template (Authentication → Emails) to link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`.
- **Delete account** (Settings) asks for the reader's username, then removes their photos and their auth user. Everything else goes with the profile: likes, bookmarks, follows, settings, notifications and replies. Replies that other people answered stay in their threads as "This reply was deleted", without the author. It needs `SUPABASE_SECRET_KEY` on the server; without it, the button explains that deletion isn't set up.

### Replies

- **Threads:** replies are grouped under the comment that started the thread, oldest first, with "Replying to @handle" when they answer another reply. Threads with more than three replies show two until opened. Each story loads its 100 most-liked threads.
- **Likes** on replies are saved like other likes.
- **Delete:** readers delete their own replies from the ⋯ menu. One that others answered stays as a placeholder so the thread still makes sense; it goes once nothing answers it.
- **Report:** readers report other people's replies (spam, harassment or hate, misleading, something else). Reported replies fold away for the reporter. Reports from three readers hide a reply for everyone (`comments.hidden_at`) until someone reviews it.
- **Spam limits**, checked by the database so every client gets them: 5 replies a minute and 30 an hour per reader, at most two links in a reply, and not the same text twice on one story in a day. Readers can send 20 reports an hour. The reader sees the database's message, such as "You're replying too fast".

Review reported replies in the SQL editor:

```sql
-- Replies with reports, most reported first.
select c.id, c.body, p.handle, c.hidden_at, count(*) as reports, array_agg(distinct r.reason) as reasons
from public.comment_reports r
join public.comments c on c.id = r.comment_id
left join public.profiles p on p.id = c.user_id
group by c.id, p.handle
order by reports desc;

-- Show a hidden reply again, forgetting its reports so the next one doesn't hide it straight away.
delete from public.comment_reports where comment_id = '<comment id>';
update public.comments set hidden_at = null where id = '<comment id>';

-- Or hide one yourself.
update public.comments set hidden_at = now() where id = '<comment id>';
```

### Video and sensitive media

- News ingestion stores a story's video when the feed offers an MP4 or WebM (`media:content` or an enclosure, HTTPS only), and marks a story sensitive when the feed rates its media adult (`media:rating`) or the headline or summary carries a warning such as "graphic footage" or "distressing images".
- **Autoplay video** (Settings, off by default): story videos play muted, on a loop, while they're on screen in feeds, with a button to unmute. Otherwise they show a play badge and play on the story page, which always has a player. Readers who ask their system to reduce motion don't get autoplay.
- **Hide sensitive content** (on by default): sensitive photos and videos are blurred, with a button to show them.
- In demo mode, the "solar storm" story has a video (`public/demo/aurora.mp4`) and the "wildfire" story is marked sensitive.

## Notifications

Database triggers create notifications (`supabase/migrations/20261027000000_notifications.sql`), so every way of writing a reply, like or follow notifies the same way:

- **Replies:** someone replies to your comment. Reply to a comment with its reply button; the reply shows "Replying to @handle".
- **Mentions:** someone writes `@yourhandle` in a comment.
- **Likes:** people like your comment. Likes on one comment gather in one item ("Ava and 3 others liked your reply") until you've seen it. Unliking takes the person out again.
- **Follows:** people follow you from your page at `/user/<handle>`. New followers gather the same way.
- **Breaking news:** a source or topic you follow publishes a story whose headline starts with "Breaking:". Stories older than 6 hours (a feed catching up) don't alert anyone.

Settings → Notifications decides what you get: **Replies and mentions** and **Breaking news alerts** turn those off entirely. Likes and follows have no setting. **Daily brief** isn't sent yet.

**Live updates** poll rather than hold a connection open:

- The unread badge checks `/api/notifications/unread` every 30 seconds while the tab is visible, as soon as you come back to the tab, and when a push arrives. Opening Notifications marks everything shown as read.
- Feeds check `/api/feed/new` every minute while visible. When stories newer than the newest one shown are out, a "N new stories" button appears; it loads them fresh, skipping the minute-long cache.

### Browser push notifications

Readers turn push on per device in Settings → Notifications. The row only appears once the site is built with VAPID keys, so redeploy after adding them. Each notification is sent straight after the action that caused it, and each ingestion run sends any that are left (breaking news among them).

1. Generate keys once: `npx web-push generate-vapid-keys`.
2. Add to `.env.local` and your host's environment:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — the public key (safe in the browser).
   - `VAPID_PRIVATE_KEY` — the private key. Server-only: never prefix it with `NEXT_PUBLIC_`.
   - `VAPID_SUBJECT` (optional) — `mailto:you@example.com` or your site's URL, which push services use to contact you. Defaults to `NEXT_PUBLIC_SITE_URL`.
3. Push also needs `SUPABASE_SECRET_KEY` (see [news ingestion](#set-it-up)), which the sender uses to reach every reader's devices.

Chrome, Edge, Firefox and Safari on macOS support it. On iPhone and iPad, readers first add Pulse to the Home Screen (Share → Add to Home Screen) and turn push on there. Signing out turns push off on that device. The service worker is `public/sw.js`.

### Weekly email digest

Readers who turn on **Weekly email digest** get the week's 10 most-read stories every Sunday at 08:00 UTC (`vercel.json`). It's sent with [Resend](https://resend.com):

1. Create a Resend account and verify your domain. Until you do, Resend only delivers to your own address.
2. Add to your host's environment:
   - `RESEND_API_KEY` — server-only.
   - `DIGEST_FROM` — the sender, e.g. `Pulse <digest@yourdomain.com>`, on the verified domain.
   - `NEXT_PUBLIC_SITE_URL` — your live URL. The email's links use it.
   - `CRON_SECRET` and `SUPABASE_SECRET_KEY` — as for ingestion. Vercel Cron sends `CRON_SECRET` itself.
3. To send one by hand: `curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/digest`. Each reader gets one email per week however often it runs. If a batch fails (say Resend's daily limit), those readers get it when you run it again that week; the response lists how many were sent and failed.

Every email has an unsubscribe link, which asks for confirmation first, and a one-click unsubscribe header for email apps. Links are signed with `CRON_SECRET`, so changing it makes older links stop working. Resend's free plan sends 100 emails a day.

## News ingestion

Real stories come from publishers' public RSS and Atom feeds. `/api/ingest` polls every active feed in the `feeds` table, stores new stories and refreshes "What's happening".

- **What's stored:** the headline, a short summary, an image and the link. The story page sends readers to the publisher for the full article. Check each publisher's RSS terms before using their feeds commercially.
- **Duplicates:** each story is stored once per URL, after removing tracking parameters such as `utm_*`. Unchanged feeds cost a single "304 Not Modified" response, thanks to ETag and Last-Modified headers.
- **First run:** only the last 3 days of items are imported, at most 30 per feed per run.
- **Breaking news:** headlines starting with "Breaking:" get the red Live banner. The flag clears after 6 hours.
- **Trends:** worked out from the last 24 hours of stories. Topics are publisher tags and names that appear in headlines, ranked by how many different sources cover them.
- **Failures:** one broken feed never stops a run. Its error is saved in `feeds.last_error`.

### Set it up

1. Add to `.env.local` (and to your host's environment):
   - `SUPABASE_SECRET_KEY` — the server-only secret key (Project Settings → API keys). Never prefix it with `NEXT_PUBLIC_`.
   - `CRON_SECRET` — any long random string, e.g. `openssl rand -hex 32`.
2. Run it once locally: start `npm run dev`, then `npm run ingest` in another terminal. It prints one line per feed and how many stories were added.
3. Schedule it in production — every 15 minutes is a good default:
   - **Supabase (free on all plans):** paste your `CRON_SECRET` into `supabase/cron.sql` in the SQL editor and run it. The secret is stored in Supabase Vault; change the site URL in the file if you deploy elsewhere.
   - **Vercel Cron:** add `{ "crons": [{ "path": "/api/ingest", "schedule": "*/15 * * * *" }] }` to `vercel.json`. Vercel sends `CRON_SECRET` automatically. Sub-daily schedules need a Pro plan.
   - **Anything else:** `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/ingest`.

### Manage feeds

```sql
-- Add a feed
insert into public.feeds (source_id, url, category)
select id, 'https://example.com/feed.xml', 'tech' from public.sources where handle = 'arstechnica';

-- Pause one
update public.feeds set active = false where url = 'https://example.com/feed.xml';

-- Check health
select url, last_success_at, last_error from public.feeds order by last_error nulls last;
```

Categories are `world`, `politics`, `business`, `tech`, `science`, `health`, `sports`, `entertainment` and `climate`.

## Tests and CI

GitHub Actions (`.github/workflows/ci.yml`) runs three jobs, side by side, on every pull request and on pushes to `master`:

| Job | What it checks |
| --- | --- |
| Lint, types and unit tests | `npm run lint`, `npm run typecheck`, `npm test` |
| End-to-end (demo mode) | A production build without Supabase, tested with Playwright on a desktop and a phone screen: the feed, likes and bookmarks, search, threads, autoplay and the sensitive-content blur |
| End-to-end (Supabase) | A local Supabase stack in Docker, built from `supabase/migrations` and `supabase/seed.sql`, and a production build against it. Tests cover sign-up and sign-in, password resets (the email is read from the local mail catcher), threads, reply likes, deleting and reporting replies, the spam limits, profile photos and the storage rules, deleting an account, activity and settings saved to the account, notifications, and the API routes |

When a job fails, its Playwright report and traces are uploaded with the run. To block merges until the checks pass, require them in **Settings → Branches** for `master`.

### Running them locally

```bash
npx playwright install chromium   # once
npm run test:e2e                  # demo mode
npm run test:e2e:supabase         # needs Docker; starts the local Supabase stack if it isn't running
```

- Both build the app first. Add `-- --no-build` to reuse the last build when only the tests changed; other Playwright options go after `--` too (`-- --ui`, `-- e2e/supabase/replies.spec.ts`).
- Your `.env.local` is never used: `scripts/e2e.mjs` sets every variable in `.env.example`, so the tests can't reach your real project.
- The local stack (`supabase/config.toml`) serves HTTPS with a self-signed certificate created in `e2e/.certs/`, because photo URLs must be https, as in production. If you already run `npx supabase start` for development, stop it first with `npx supabase stop`.
- Every test signs up its own readers, so tests run in parallel and can run again on the same database. `npx supabase stop --no-backup` wipes it.
- Nothing leaves the machine: publisher photos are replaced with a blank pixel.

## Project structure

```
src/
  app/
    (main)/            Three-column shell (nav · timeline · sidebar) and all app pages
    (auth)/            Full-screen login / signup
    auth/callback/     OAuth, email confirmation and password-reset code exchange
    auth/confirm/      Email links with a token hash (cross-device reset links)
    api/feed/          Next page of a feed, for infinite scroll; /new counts newer stories
    api/notifications/ Next page of notifications; /unread for the badge
    api/ingest/        Protected endpoint that runs news ingestion (and sends pending pushes)
    api/digest/        Protected endpoint that mails the weekly digest; /unsubscribe for one-click
  components/
    article/           Threaded replies with delete and report
    feed/              Article card, media (video, sensitive blur), actions bar, feed view, infinite-scroll list
    profile/           Profile tabs and the edit-profile form
    settings/          Settings rows, push and delete-account controls
    layout/            Sidebars, mobile nav (with the unread badge), sticky page header, search
    people/            Readers in lists
    ui/                Avatar, verified badge, generated cover art, tabs, switch, dialog, menu, …
  lib/
    data/              Data access: mock data or Supabase, same return types; paged feeds
    ingest/            RSS/Atom parsing, cleanup, trend detection and the ingestion run
    push/              Browser push: VAPID config, the sender and the browser side
    digest/            Weekly digest email, run and Resend sender
    mock/              Mock sources, articles, comments, trends, notifications
    supabase/          Browser / server / proxy / admin clients and database types
    store/             Client state: likes, follows, settings and unread notifications (account, or localStorage in demo mode)
    actions/           Server Actions (auth, account, comments, reader activity, notifications, push, digest)
  proxy.ts             Supabase session refresh
supabase/              Migrations, local stack config, starter feeds, cron template and demo seed
e2e/                   Playwright tests: demo/ (no Supabase), supabase/ (local stack), shared support/ and fixtures/
scripts/e2e.mjs        Builds the app for a test target and runs Playwright
.github/workflows/     CI
```

## Design notes

- Colors follow X's "Lights out" theme: true black `#000`, borders `#2f3336`, text `#e7e9ea`, accent `#1d9bf0`. Tokens live in `src/app/globals.css`.
- Publishers get rounded-square avatars and gold checkmarks; people get round avatars and blue checks, as on X.
- Stories without an `image_url`, or whose image fails to load, get generated mesh-gradient cover art per category (`src/components/ui/cover.tsx`). Real images from any HTTPS host are rendered with `next/image`. Videos and the sensitive-content blur are handled in `src/components/feed/article-media.tsx`.
- Counts that are zero (likes, views, …) are hidden, as on X, so real stories never show made-up numbers.
- Responsive: bottom tab bar on phones, icon-only nav rail on tablets, full sidebar plus trends column on desktop.
- The site name lives in `src/lib/site.ts`.
