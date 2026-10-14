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
