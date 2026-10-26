import { cacheLife } from "next/cache";
import { isAfterCursor, decodeCursor, encodeCursor, type AfterCursor } from "@/lib/data/feeds";
import { mockNotifications } from "@/lib/mock/community";
import {
  matchesFilter,
  toAppNotification,
  type NotificationFilter,
  type NotificationJson,
} from "@/lib/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/types";
import { countUnread } from "./activity";
import { fail } from "./mappers";
import { getViewer } from "./viewer";

/*
 * The signed-in reader's notifications (supabase/migrations/20261027000000_notifications.sql).
 * These read the session, so render callers inside <Suspense>. Demo mode
 * shows src/lib/mock notifications.
 */

export const NOTIFICATIONS_PAGE_SIZE = 20;

export interface NotificationsPage {
  notifications: AppNotification[];
  /** Cursor for the next page, or null after the last. */
  next: string | null;
  /** When the newest row on this page was last updated, to mark what was seen as read. */
  newestAt: string | null;
}

/** One page, newest activity first; null when signed out. Bad cursors throw InvalidFeedError. */
export async function getNotificationsPage(
  filter: NotificationFilter,
  rawCursor: string | null,
): Promise<NotificationsPage | null> {
  const cursor = decodeCursor<AfterCursor>(rawCursor, isAfterCursor);
  if (!isSupabaseConfigured()) return demoPage(filter, cursor);

  if (!(await getViewer())) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("notifications_page", {
    page_size: NOTIFICATIONS_PAGE_SIZE + 1,
    filter,
    before_at: cursor?.at ?? null,
    before_id: cursor?.id ?? null,
  });
  if (error) fail("notifications", error);
  return toPage(data as unknown as NotificationJson[]);
}

/** Unread notifications; 0 when signed out. In demo mode the browser tracks what's been seen. */
export async function getUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured()) return mockNotifications.filter((notification) => notification.unread).length;
  return countUnread(await createClient());
}

// The cursor is the last row fetched, shown or not, so pages never overlap.
function toPage(rows: NotificationJson[]): NotificationsPage {
  const page = rows.slice(0, NOTIFICATIONS_PAGE_SIZE);
  const last = page.at(-1);
  return {
    notifications: page.flatMap((row) => toAppNotification(row) ?? []),
    next: rows.length > NOTIFICATIONS_PAGE_SIZE && last ? encodeCursor({ at: last.updated_at, id: last.id }) : null,
    newestAt: rows[0]?.updated_at ?? null,
  };
}

/** Cached like the mock feed, so times stay put while the page prerenders. */
async function demoPage(filter: NotificationFilter, cursor: AfterCursor | null): Promise<NotificationsPage> {
  "use cache";
  cacheLife("minutes");

  // Six of them: one page.
  if (cursor) return { notifications: [], next: null, newestAt: null };
  const now = Date.now();
  const rows = mockNotifications
    .filter((notification) => matchesFilter(filter, notification.kind))
    .sort((a, b) => a.minutesAgo - b.minutesAgo)
    .map(({ minutesAgo, ...row }): NotificationJson => {
      const at = new Date(now - minutesAgo * 60_000).toISOString();
      return { ...row, created_at: at, updated_at: at };
    });
  return {
    notifications: rows.flatMap((row) => toAppNotification(row) ?? []),
    next: null,
    newestAt: rows[0]?.updated_at ?? null,
  };
}
