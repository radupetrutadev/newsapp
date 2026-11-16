import type { NextRequest } from "next/server";
import { getFeedPage, InvalidFeedError, type LocalLists } from "@/lib/data/feeds";
import { parseFeedParams } from "@/lib/feeds";
import { HISTORY_SIZE } from "@/lib/ranking";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The next page of a feed as the reader scrolls: GET /api/feed?feed=…&cursor=…
 * with the query string from `feedParams` (src/lib/feeds.ts). Answers
 * { articles, next } like getFeedPage. `fresh=1` skips the cache for the
 * first page, after the reader asked for new stories.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const feed = parseFeedParams(params);
  if (!feed) return Response.json({ error: "Unknown feed." }, { status: 400 });

  try {
    const page = await getFeedPage(feed, params.get("cursor"), localLists(params), {
      fresh: params.get("fresh") === "1",
    });
    // "For you" and "Following" depend on who's asking.
    return Response.json(page, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof InvalidFeedError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return Response.json({ error: "Couldn't load stories." }, { status: 500 });
  }
}

/** Demo mode keeps the reader's follows and reading history in their browser, so the client sends them. */
function localLists(params: URLSearchParams): LocalLists | undefined {
  if (isSupabaseConfigured()) return undefined;
  const list = (name: string, limit = 100) => (params.get(name) ?? "").split(",").filter(Boolean).slice(0, limit);
  return { sources: list("sources"), topics: list("topics"), read: list("read", HISTORY_SIZE) };
}
