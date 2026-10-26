import { getUnreadCount } from "@/lib/data/notifications";

/** How many unread notifications the reader has: { count }. Polled for the badge. */
export async function GET() {
  return Response.json({ count: await getUnreadCount() }, { headers: { "Cache-Control": "private, no-store" } });
}
