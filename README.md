# Pulse — a real-time news feed

A news app with an X (Twitter)-style interface, dark mode only. Built with **Next.js 16 (App Router, Cache Components)**, **TypeScript**, **Tailwind CSS v4** and **Supabase**.

It runs out of the box on mock data ("demo mode"). Add Supabase keys and the same UI reads from your database and enables real accounts.

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
2. Run the migration, then the seed, in the SQL editor (or with the Supabase CLI: `supabase db push` and `supabase db reset`):
   - `supabase/migrations/20261014000000_init.sql` — tables, indexes, RLS policies, a trigger that creates a profile for each new user, and a trigger that keeps comment counts in sync.
   - `supabase/seed.sql` — the demo publishers, stories and trends.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works.
4. For OAuth, enable Google and/or GitHub under Authentication → Providers and add `http://localhost:3000/auth/callback` (and your production URL) to the redirect allow list.

Restart `npm run dev` after changing env vars.

### What uses Supabase today

- **Reads:** feed, articles, sources, trends and comments (`src/lib/data`). Public reads use a cookie-free client inside `"use cache"` functions, so pages are prerendered and revalidate every minute.
- **Auth:** sign in, sign up, OAuth, sign out (`src/lib/actions/auth.ts`); the session is refreshed in `src/proxy.ts`.
- **Writes:** posting a reply (`src/lib/actions/comments.ts`).

Still client-side for now (saved in `localStorage`): likes, reposts, bookmarks, follows and settings (`src/lib/store`). The `likes`, `bookmarks` and `follows` tables and their RLS policies are already in the schema, ready for the move. Notifications are mock-only.

## Project structure

```
src/
  app/
    (main)/            Three-column shell (nav · timeline · sidebar) and all app pages
    (auth)/            Full-screen login / signup
    auth/callback/     OAuth + email confirmation code exchange
  components/
    feed/              Article card, actions bar, feed view, breaking banner
    layout/            Sidebars, mobile nav, sticky page header, search
    ui/                Avatar, verified badge, generated cover art, tabs, switch, …
  lib/
    data/              Data access: mock data or Supabase, same return types
    mock/              Mock sources, articles, comments, trends, notifications
    supabase/          Browser / server / proxy clients and database types
    store/             localStorage-backed client state (engagement, settings)
    actions/           Server Actions (auth, comments)
  proxy.ts             Supabase session refresh
supabase/              SQL migration and generated seed
```

## Design notes

- Colors follow X's "Lights out" theme: true black `#000`, borders `#2f3336`, text `#e7e9ea`, accent `#1d9bf0`. Tokens live in `src/app/globals.css`.
- Publishers get rounded-square avatars and gold checkmarks; people get round avatars and blue checks, as on X.
- Stories without an `image_url` get generated mesh-gradient cover art per category (`src/components/ui/cover.tsx`). Real images from any HTTPS host are rendered with `next/image`.
- Responsive: bottom tab bar on phones, icon-only nav rail on tablets, full sidebar plus trends column on desktop.
- The site name lives in `src/lib/site.ts`.
