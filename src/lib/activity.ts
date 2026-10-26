import type { Settings } from "@/lib/settings";

/*
 * Reader activity shared by the server (actions, loading) and the client
 * store. Every list holds ids: articles for liked/reposted/bookmarked,
 * sources for following, category slugs for topics, comments for
 * likedComments and readers for people.
 */

export type EngagementList =
  | "liked"
  | "reposted"
  | "bookmarked"
  | "following"
  | "topics"
  | "likedComments"
  | "people";

export const engagementLists: EngagementList[] = [
  "liked",
  "reposted",
  "bookmarked",
  "following",
  "topics",
  "likedComments",
  "people",
];

/** An item in one of the reader's lists and when it was added. */
export interface ActivityItem {
  id: string;
  at: string;
}

/** What the server knows about the reader, loaded once per page load. */
export type AccountActivity =
  | { status: "signed-out" }
  /** Signed in, but their activity could not be loaded. */
  | { status: "unavailable"; userId: string }
  | {
      status: "ready";
      userId: string;
      /** Newest first. */
      lists: Record<EngagementList, ActivityItem[]>;
      settings: Settings;
      unreadNotifications: number;
    };

/** An item switched on or off. `at` is server time in ms, or null while the request is in flight. */
export interface ActivityChange {
  on: boolean;
  at: number | null;
}

/**
 * Like and repost counts on cached pages were read at `countedAt`, so they
 * may or may not include the reader's own latest change. Returns what to add
 * to such a count (+1, -1 or 0) so it matches the reader's current state.
 * Without `countedAt` (demo data) counts never include the reader.
 */
export function countAdjustment(
  on: boolean,
  changes: readonly ActivityChange[] | undefined,
  countedAt: string | undefined,
): number {
  const counted = countedAt ? Date.parse(countedAt) : -Infinity;
  let included = false;
  for (const change of changes ?? []) {
    if (change.at !== null && change.at <= counted) included = change.on;
  }
  return Number(on) - Number(included);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
