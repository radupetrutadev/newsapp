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
| `npm run ingest` | Fetch all RSS feeds once, on a running server (see [News ingestion](#news-ingestion)) |
| `npm run db:seed:generate` | Regenerate `supabase/seed.sql` from the mock data (Node 22.18+) |

## Pages

| Route | Page |
| --- | --- |
| `/` | **Feed** — "For you" / "Following" tabs, topic chips, live breaking banner |
| `/article/[slug]` | Story — full article, engagement stats, replies, related stories |
| `/explore` | Search, most-read hero, top stories carousel, trends, topics, sources |
| `/search?q=` | Search results for stories and sources |
| `/notifications` | All / Breaking / Mentions |
| `/bookmarks` | Saved stories |
| `/topics`, `/topics/[slug]` | Follow topics; per-topic feed |
| `/source/[handle]` | Publisher profile (banner, bio, follow, Latest / Top) |
| `/profile` | Your profile — likes, reposts, sources you follow |
| `/settings` | Account, feed, notification and display preferences |
| `/login`, `/signup` | Email/password and Google/GitHub sign-in via Supabase Auth |
| `/about`, `/terms`, `/privacy` | Static pages (Terms and Privacy are placeholders) |

## Connecting Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations in order in the SQL editor (or `supabase db push` with the Supabase CLI):
   - `supabase/migrations/20261014000000_init.sql` — tables, indexes, RLS policies, a trigger that creates a profile for each new user, and a trigger that keeps comment counts in sync.
   - `supabase/migrations/20261019000000_feeds.sql` — the `feeds` table, one row per story URL, and the function that refreshes trends.
   - `supabase/migrations/20261024000000_activity.sql` — reposts, followed topics and settings tables, triggers that keep like, repost and follower counts in sync, and the story view counter.
3. Load content — pick one:
   - **Real news:** run `supabase/feeds.sql` (12 publishers, 28 RSS feeds), then set up [news ingestion](#news-ingestion).
   - **Demo content:** run `supabase/seed.sql` for the fictional stories from demo mode. Don't mix it with real news in production.
4. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works.
5. For OAuth, enable Google and/or GitHub under Authentication → Providers and add `http://localhost:3000/auth/callback` (and your production URL) to the redirect allow list.

Restart `npm run dev` after changing env vars.

### What uses Supabase today

- **Reads:** feed, articles, sources, trends and comments (`src/lib/data`). Public reads use a cookie-free client inside `"use cache"` functions, so pages are prerendered and revalidate every minute.
- **Auth:** sign in, sign up, OAuth, sign out (`src/lib/actions/auth.ts`); the session is refreshed in `src/proxy.ts`.
- **Writes:** replies (`src/lib/actions/comments.ts`); likes, reposts, bookmarks, followed sources and topics, settings and story views (`src/lib/actions/activity.ts`); stories and trends from news ingestion (`src/lib/ingest`).

### Reader activity

- Likes, reposts, bookmarks, follows and settings are saved to the reader's account. They load once per page visit (`src/components/layout/activity-sync.tsx`) into the client stores in `src/lib/store`.
- Buttons update straight away and undo themselves, with a message, if saving fails. Signed-out readers are asked to sign in.
- Like, repost and follower counts are kept up to date by database triggers. Pages are cached for about a minute, so the app adds the reader's own recent changes to cached counts until the cache catches up.
- A story view is counted when its page opens, at most once per day per browser. Views aren't protected against someone deliberately calling the counter over and over.
- In demo mode, all of this stays in the browser's `localStorage`, as before. Notifications are still mock-only.

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

## Project structure

```
src/
  app/
    (main)/            Three-column shell (nav · timeline · sidebar) and all app pages
    (auth)/            Full-screen login / signup
    auth/callback/     OAuth + email confirmation code exchange
    api/ingest/        Protected endpoint that runs news ingestion
  components/
    feed/              Article card, actions bar, feed view, breaking banner
    layout/            Sidebars, mobile nav, sticky page header, search
    ui/                Avatar, verified badge, generated cover art, tabs, switch, …
  lib/
    data/              Data access: mock data or Supabase, same return types
    ingest/            RSS/Atom parsing, cleanup, trend detection and the ingestion run
    mock/              Mock sources, articles, comments, trends, notifications
    supabase/          Browser / server / proxy / admin clients and database types
    store/             Client state: likes, follows and settings (account, or localStorage in demo mode)
    actions/           Server Actions (auth, comments, reader activity)
  proxy.ts             Supabase session refresh
supabase/              Migrations, starter feeds, cron template and demo seed
```

## Design notes

- Colors follow X's "Lights out" theme: true black `#000`, borders `#2f3336`, text `#e7e9ea`, accent `#1d9bf0`. Tokens live in `src/app/globals.css`.
- Publishers get rounded-square avatars and gold checkmarks; people get round avatars and blue checks, as on X.
- Stories without an `image_url`, or whose image fails to load, get generated mesh-gradient cover art per category (`src/components/ui/cover.tsx`). Real images from any HTTPS host are rendered with `next/image`.
- Counts that are zero (likes, views, …) are hidden, as on X, so real stories never show made-up numbers.
- Responsive: bottom tab bar on phones, icon-only nav rail on tablets, full sidebar plus trends column on desktop.
- The site name lives in `src/lib/site.ts`.
