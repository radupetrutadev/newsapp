import type { NextRequest } from "next/server";
import { InvalidFeedError } from "@/lib/data/feeds";
import { getNotificationsPage } from "@/lib/data/notifications";
import { isNotificationFilter } from "@/lib/notifications";

/**
 * The next page of the reader's notifications:
 * GET /api/notifications?filter=all|breaking|mentions&cursor=…
 * Answers { notifications, next }, or 401 when signed out.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filter = params.get("filter") ?? "all";
  if (!isNotificationFilter(filter)) return Response.json({ error: "Unknown filter." }, { status: 400 });

  try {
    const page = await getNotificationsPage(filter, params.get("cursor"));
    if (!page) return Response.json({ error: "Sign in to see notifications." }, { status: 401 });
    return Response.json(page, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof InvalidFeedError) return Response.json({ error: error.message }, { status: 400 });
    console.error(error);
    return Response.json({ error: "Couldn't load notifications." }, { status: 500 });
  }
}
