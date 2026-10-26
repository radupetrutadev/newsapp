import { getCategory } from "@/lib/categories";
import type { Article, CategorySlug } from "@/lib/types";

/** A list of stories that loads one page at a time (see src/lib/data/feeds.ts). */
export type FeedSpec =
  /** Ranked by the reader's topics, recency and engagement. */
  | { kind: "for-you"; category: CategorySlug | null }
  /** Newest first, from the sources the reader follows. */
  | { kind: "following"; category: CategorySlug | null }
  /** Newest first, in one topic. */
  | { kind: "topic"; category: CategorySlug }
  /** One publisher's stories, newest or most liked first. */
  | { kind: "source"; sourceId: string; order: "latest" | "top" }
  /** Best match first. */
  | { kind: "search"; query: string };

export interface FeedPage {
  articles: Article[];
  /** Pass back to get the next page; null on the last one. */
  next: string | null;
}

export const MAX_QUERY_LENGTH = 200;

/** The query string /api/feed reads a feed from. */
export function feedParams(feed: FeedSpec): URLSearchParams {
  const params = new URLSearchParams({ feed: feed.kind });
  switch (feed.kind) {
    case "for-you":
    case "following":
    case "topic":
      if (feed.category) params.set("category", feed.category);
      break;
    case "source":
      params.set("source", feed.sourceId);
      params.set("order", feed.order);
      break;
    case "search":
      params.set("q", feed.query);
      break;
  }
  return params;
}

/** The feed in a query string from `feedParams`, or null if it isn't one. */
export function parseFeedParams(params: URLSearchParams): FeedSpec | null {
  const rawCategory = params.get("category");
  const category = rawCategory === null ? null : (getCategory(rawCategory)?.slug ?? false);
  if (category === false) return null;

  switch (params.get("feed")) {
    case "for-you":
    case "following":
      return { kind: params.get("feed") as "for-you" | "following", category };
    case "topic":
      return category ? { kind: "topic", category } : null;
    case "source": {
      const sourceId = params.get("source");
      const order = params.get("order");
      if (!sourceId || sourceId.length > 64 || (order !== "latest" && order !== "top")) return null;
      return { kind: "source", sourceId, order };
    }
    case "search": {
      const query = params.get("q")?.trim();
      if (!query || query.length > MAX_QUERY_LENGTH) return null;
      return { kind: "search", query };
    }
    default:
      return null;
  }
}

/**
 * Feeds that offer "new stories" as they're published: the newest-first and
 * ranked ones. Search results and a source's top stories don't.
 */
export function isLiveFeed(feed: FeedSpec): boolean {
  if (feed.kind === "search") return false;
  return feed.kind !== "source" || feed.order === "latest";
}

/** The newest publication time among stories, to ask what's been published since. */
export function newestPublishedAt(articles: Article[]): string | null {
  let newest: string | null = null;
  for (const article of articles) {
    if (newest === null || Date.parse(article.publishedAt) > Date.parse(newest)) newest = article.publishedAt;
  }
  return newest;
}
