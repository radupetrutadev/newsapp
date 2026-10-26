import type { NextRequest } from "next/server";
import { countNewStories, InvalidFeedError } from "@/lib/data/feeds";
import { parseFeedParams } from "@/lib/feeds";

/**
 * How many stories in a feed were published after `since`:
 * GET /api/feed/new?feed=…&since=<ISO time>, answering { count }.
 * Open feeds ask every minute to offer "new stories".
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const feed = parseFeedParams(params);
  if (!feed) return Response.json({ error: "Unknown feed." }, { status: 400 });

  try {
    const count = await countNewStories(feed, params.get("since") ?? "");
    return Response.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof InvalidFeedError) return Response.json({ error: error.message }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Couldn't check for new stories." }, { status: 500 });
  }
}
