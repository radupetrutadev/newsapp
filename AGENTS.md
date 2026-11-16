<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project notes

- Next.js 16 with `cacheComponents` and `partialPrefetching` enabled. Data reads in `src/lib/data` use `"use cache"` + `cacheLife`; anything that reads cookies, `params` or `searchParams` must sit inside `<Suspense>` (see the dynamic pages under `src/app/(main)`).
- Demo mode: when `NEXT_PUBLIC_SUPABASE_URL` / key are unset, `src/lib/data` serves `src/lib/mock` and `getViewer()` returns a demo user. Keep both paths returning the same types.
- Keep imports in `src/lib/mock` type-only so `scripts/generate-seed.mjs` can load them with plain Node; rerun `npm run db:seed:generate` after editing mock data.
- `src/lib/supabase/database.types.ts` mirrors `supabase/migrations`; update both together.
- Dark mode only. Use the color tokens in `src/app/globals.css` (`bg-surface`, `text-muted`, `border-border`, `text-accent`, …) rather than raw hex values.
- News ingestion lives in `src/lib/ingest` (parse → normalize → store, plus trends) and runs from `src/app/api/ingest/route.ts` with the service-role client in `src/lib/supabase/admin.ts`. Keep ingestion logic free of Supabase imports so it stays testable; only `supabase-store.ts` talks to the database.
- Run `npm test` after changing `src/lib/ingest`. Feed fixtures are in `src/lib/ingest/__fixtures__`.
- Never show invented numbers for real content: counts of 0 are hidden in the UI.
- Reader activity (likes, reposts, bookmarks, follows, topics, settings) lives in the client stores in `src/lib/store`. They use localStorage in demo mode; otherwise they're filled by `ActivitySync` in the main layout and saved with `src/lib/actions/activity.ts`. Keep the defaults in `src/lib/settings.ts` in sync with `public.user_settings`.
- Cached counts carry `countedAt`; show them through `useAdjustedCount` so the reader's own changes are neither missing nor counted twice.
- Read the Supabase session only through `createClient()` in `src/lib/supabase/server.ts`. It calls `io()` first, because Supabase Auth reads the clock, which Next.js forbids while prerendering.
- Lists of stories page through `getFeedPage` (`src/lib/data/feeds.ts`) and render with `<FeedList>`, which loads more from `/api/feed`. Don't load a fixed number of stories and filter them in the app.
- The "For you" formula exists twice: `public.for_you_feed` (SQL) and `src/lib/ranking.ts` (demo mode). Change both together.
- `ARTICLE_SELECT` in `src/lib/data/mappers.ts` lists article columns so `search_vector` isn't sent; add new article columns there.
- Notifications are created by triggers in `supabase/migrations/20261027000000_notifications.sql`, not by app code. Their wording lives in `src/lib/notifications.ts`, shared by the page and push. After an action that can notify someone, call `sendPushSoon()` (`src/lib/push/send.ts`).
- `comment_likes` links comments and profiles a second way, so embed a comment's author as `profiles!user_id`. `COMMENT_SELECT` in `src/lib/data/mappers.ts` does this.
- Comments are read on every request (`getComments`, after `connection()`), so a reply a notification points at is always there. Don't put them back behind `"use cache"`.
- Replies form threads: a trigger sets `comments.root_id`, and `buildThreads` (`src/lib/comments.ts`) groups them on the page. Deleted replies that others answered stay as placeholders (`deleted_at`, no text or author), so delete through `public.delete_comment`, never with a plain `delete`. `mapComment` strips the text of hidden (reported) replies; keep it that way.
- Spam limits and similar checks live in triggers in `supabase/migrations/20261028000000_accounts_community.sql`. They raise `PTxxx` errors whose messages are written for readers; actions show those as they are (see `failure` in `src/lib/actions/comments.ts`).
- Profile limits in `src/lib/profile.ts` match the checks in that migration. Profile photos are resized in the browser and uploaded by `saveProfile` (`src/lib/actions/account.ts`) to the `avatars` bucket, one folder per reader.
- Story media goes through `<ArticleMedia>`, which applies the reader's autoplay and sensitive-content settings. Ingestion fills `video_url` (HTTPS MP4/WebM) and `is_sensitive`.
- End-to-end tests live in `e2e/`: `e2e/demo` runs against a demo-mode build, `e2e/supabase` against the local Supabase stack (`supabase/config.toml`). Run them with `npm run test:e2e` / `npm run test:e2e:supabase`, never `playwright test` directly: `scripts/e2e.mjs` builds for the target and keeps `.env.local` out. Add or update a test with each user-facing change.
- In tests, open pages with `open()` from `e2e/support/page.ts` (it waits for hydration) and prefer role locators: earlier routes stay in the DOM, hidden. Full-stack tests make their own readers with the `signedIn` fixture and set up data through `admin`, so they can run in parallel on a database that already has data; scope assertions to the rows a test created.
- Story clusters ("Full coverage") are found by `src/lib/ingest/cluster.ts` during ingestion, in demo mode (`getMockFeed`) and by `scripts/generate-seed.mjs`, which loads it with plain Node, so keep its run-time imports at none. "For you" shows one story per cluster in `public.for_you_feed` and in demo mode (`onePerEvent`, `src/lib/coverage.ts`). After changing the weights or `CLUSTER_THRESHOLD`, check `cluster.test.ts` against the labeled stories and update the numbers in its header and the README.
- Story embeddings (pgvector, 512 dimensions) come from `src/lib/search/openai.ts`, called by ingestion and, for queries, by `searchPage`. Only `OPENAI_API_KEY` turns them on; everything works without it. Never select `embedding` into app code: `ARTICLE_SELECT` and `article_json` leave it out. Tests use the stand-in in `e2e/support/fake-openai.mjs`, never the real API.
- "For you" reads a signed-in reader's `reading_history` in `public.for_you_feed` (`personalize`), so their pages aren't cached. Its history factor is mirrored in `storyRank` (`src/lib/ranking.ts`), which has only the topic part because demo stories have no embeddings. After changing search weights or `min_similarity`, run `npm run search:eval` with a key and update the numbers in the README.
