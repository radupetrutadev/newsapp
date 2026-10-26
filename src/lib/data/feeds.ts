import { cacheLife, cacheTag } from "next/cache";
import { isUuid } from "@/lib/activity";
import { categoryName } from "@/lib/categories";
import { isLiveFeed, type FeedPage, type FeedSpec } from "@/lib/feeds";
import { storyRank } from "@/lib/ranking";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import type { Article, CategorySlug } from "@/lib/types";
import { ARTICLE_SELECT, fail, mapArticle, type ArticleRow } from "./mappers";
import { getMockFeed } from "./mock-feed";

/*
 * Feeds, one page at a time: the first page when a page renders, then the
 * rest from /api/feed as the reader scrolls. With Supabase the database
 * filters, ranks and searches (supabase/migrations/20261026000000_feeds_search.sql);
 * in demo mode the mock stories are handled here the same way.
 *
 * Pages that look the same for everyone are cached for about a minute.
 * "For you" and "Following" read the reader's session, so render callers
 * inside <Suspense>.
 */

export const PAGE_SIZE = 20;

/** A feed or cursor that can't be served, e.g. from an edited URL. /api/feed answers 400. */
export class InvalidFeedError extends Error {}

/** Demo mode: the sources and topics the reader follows, which live in their browser. */
export interface LocalLists {
  sources: string[];
  topics: string[];
}

/**
 * One page of a feed. `fresh` skips the cache for the first page, so the
 * reader sees new stories the moment they asked for them.
 */
export async function getFeedPage(
  feed: FeedSpec,
  cursor: string | null,
  local: LocalLists = { sources: [], topics: [] },
  { fresh = false }: { fresh?: boolean } = {},
): Promise<FeedPage> {
  if (!isSupabaseConfigured()) return demoPage(feed, decodeCursor(cursor, isOffsetCursor), local);
  const uncached = fresh && cursor === null;

  switch (feed.kind) {
    case "for-you": {
      const topics = await viewerTopics();
      const offset = decodeCursor<OffsetCursor>(cursor, isOffsetCursor);
      return uncached ? queryRanked(topics, feed.category, offset) : rankedPage(topics, feed.category, offset);
    }
    case "following":
      return followingPage(feed.category, decodeCursor(cursor, isAfterCursor));
    case "topic": {
      const after = decodeCursor<AfterCursor>(cursor, isAfterCursor);
      return uncached ? queryLatest({ category: feed.category }, after) : latestPage({ category: feed.category }, after);
    }
    case "source": {
      if (!isUuid(feed.sourceId)) throw new InvalidFeedError("Unknown source.");
      if (feed.order === "top") return topPage(feed.sourceId, decodeCursor(cursor, isOffsetCursor));
      const after = decodeCursor<AfterCursor>(cursor, isAfterCursor);
      return uncached ? queryLatest({ sourceId: feed.sourceId }, after) : latestPage({ sourceId: feed.sourceId }, after);
    }
    case "search":
      return searchPage(feed.query, decodeCursor(cursor, isOffsetCursor));
  }
}

/**
 * How many stories in a live feed (see isLiveFeed) were published after
 * `since`, for the "new stories" button. Always 0 in demo mode, whose
 * stories don't change.
 */
export async function countNewStories(feed: FeedSpec, since: string): Promise<number> {
  if (!TIMESTAMP.test(since)) throw new InvalidFeedError("Invalid time.");
  if (!isLiveFeed(feed)) throw new InvalidFeedError("This feed doesn't update.");
  if (!isSupabaseConfigured()) return 0;

  let sourceIds: string[] | null = null;
  if (feed.kind === "following") {
    const { data, error } = await (await createClient()).from("follows").select("source_id");
    if (error) fail("followed sources", error);
    if (data.length === 0) return 0;
    sourceIds = data.map((row) => row.source_id);
  }

  let query = createPublicClient()
    .from("articles")
    .select("id", { count: "exact", head: true })
    .gt("published_at", since)
    .lte("published_at", new Date().toISOString());
  if (sourceIds) query = query.in("source_id", sourceIds);
  if (feed.kind === "source") {
    if (!isUuid(feed.sourceId)) throw new InvalidFeedError("Unknown source.");
    query = query.eq("source_id", feed.sourceId);
  } else if (feed.kind !== "search" && feed.category) {
    query = query.eq("category", feed.category);
  }
  const { count, error } = await query;
  if (error) fail("new stories", error);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Cursors: where the next page starts. The browser gets them as opaque strings.

/** Newest-first feeds continue after the last story shown. */
export interface AfterCursor {
  at: string;
  id: string;
}

/** Ranked feeds keep the time they were ranked at and count the stories shown. */
interface OffsetCursor {
  asOf: string;
  offset: number;
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;
/** Deep offsets make the database rank ever more stories; nobody scrolls this far. */
const MAX_OFFSET = 2_000;

// Both values end up in a PostgREST filter, so only exact formats pass.
export const isAfterCursor = (value: Record<string, unknown>) =>
  typeof value.at === "string" && TIMESTAMP.test(value.at) && isUuid(value.id);

const isOffsetCursor = (value: Record<string, unknown>) =>
  typeof value.asOf === "string" &&
  TIMESTAMP.test(value.asOf) &&
  Number.isInteger(value.offset) &&
  (value.offset as number) >= 0 &&
  (value.offset as number) <= MAX_OFFSET;

export function encodeCursor(cursor: AfterCursor | OffsetCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor<T extends AfterCursor | OffsetCursor>(
  raw: string | null,
  isValid: (value: Record<string, unknown>) => boolean,
): T | null {
  if (raw === null) return null;
  let value: unknown = null;
  try {
    value = JSON.parse(Buffer.from(raw, "base64url").toString());
  } catch {
    // Not JSON; rejected below.
  }
  if (typeof value !== "object" || value === null || !isValid(value as Record<string, unknown>)) {
    throw new InvalidFeedError("Invalid cursor.");
  }
  return value as T;
}

// Queries ask for one story more than a page to learn whether another page follows.

function afterPage(articles: Article[]): FeedPage {
  const page = articles.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    articles: page,
    next: articles.length > PAGE_SIZE && last ? encodeCursor({ at: last.publishedAt, id: last.id }) : null,
  };
}

function offsetPage(articles: Article[], asOf: string, offset: number): FeedPage {
  const more = articles.length > PAGE_SIZE && offset + PAGE_SIZE <= MAX_OFFSET;
  return {
    articles: articles.slice(0, PAGE_SIZE),
    next: more ? encodeCursor({ asOf, offset: offset + PAGE_SIZE }) : null,
  };
}

// ---------------------------------------------------------------------------
// Supabase

function toArticles(data: unknown, countedAt: string): Article[] {
  return (data as ArticleRow[]).map((row) => mapArticle(row, countedAt));
}

/** Topics the signed-in reader follows; none when signed out (RLS returns no rows). */
async function viewerTopics(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("topic_follows").select("category");
  if (error) {
    console.error(`Supabase: failed to load followed topics: ${error.message}`);
    return [];
  }
  // Sorted so readers who follow the same topics share cached pages.
  return data.map((row) => row.category).sort();
}

async function rankedPage(
  topics: string[],
  category: CategorySlug | null,
  cursor: OffsetCursor | null,
): Promise<FeedPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");
  return queryRanked(topics, category, cursor);
}

async function queryRanked(
  topics: string[],
  category: CategorySlug | null,
  cursor: OffsetCursor | null,
): Promise<FeedPage> {
  const asOf = cursor?.asOf ?? new Date().toISOString();
  const offset = cursor?.offset ?? 0;
  const { data, error } = await createPublicClient().rpc("for_you_feed", {
    as_of: asOf,
    page_offset: offset,
    page_size: PAGE_SIZE + 1,
    topics,
    category,
  });
  if (error) fail("For you", error);
  return offsetPage(toArticles(data, new Date().toISOString()), asOf, offset);
}

/** Per reader, so not cached. */
async function followingPage(
  category: CategorySlug | null,
  cursor: AfterCursor | null,
): Promise<FeedPage> {
  const supabase = await createClient();
  const countedAt = new Date().toISOString();
  const { data, error } = await supabase.rpc("following_feed", {
    page_size: PAGE_SIZE + 1,
    category,
    before_at: cursor?.at ?? null,
    before_id: cursor?.id ?? null,
  });
  if (error) fail("Following", error);
  return afterPage(toArticles(data, countedAt));
}

async function latestPage(
  filter: { category: CategorySlug } | { sourceId: string },
  cursor: AfterCursor | null,
): Promise<FeedPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");
  return queryLatest(filter, cursor);
}

async function queryLatest(
  filter: { category: CategorySlug } | { sourceId: string },
  cursor: AfterCursor | null,
): Promise<FeedPage> {
  const countedAt = new Date().toISOString();
  let query = createPublicClient().from("articles").select(ARTICLE_SELECT);
  query = "category" in filter ? query.eq("category", filter.category) : query.eq("source_id", filter.sourceId);
  if (cursor) {
    // Older than the last story shown; ties on the time are broken by id. The
    // first condition lets Postgres walk the index from there.
    query = query
      .lte("published_at", cursor.at)
      .or(`published_at.lt."${cursor.at}",and(published_at.eq."${cursor.at}",id.lt.${cursor.id})`);
  }
  const { data, error } = await query
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (error) fail("stories", error);
  return afterPage(toArticles(data, countedAt));
}

async function topPage(sourceId: string, cursor: OffsetCursor | null): Promise<FeedPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  const asOf = cursor?.asOf ?? new Date().toISOString();
  const offset = cursor?.offset ?? 0;
  const { data, error } = await createPublicClient()
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("source_id", sourceId)
    .lte("published_at", asOf)
    .order("likes_count", { ascending: false })
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + PAGE_SIZE);
  if (error) fail("top stories", error);
  return offsetPage(toArticles(data, new Date().toISOString()), asOf, offset);
}

async function searchPage(query: string, cursor: OffsetCursor | null): Promise<FeedPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  const asOf = cursor?.asOf ?? new Date().toISOString();
  const offset = cursor?.offset ?? 0;
  const { data, error } = await createPublicClient().rpc("search_articles", {
    query,
    as_of: asOf,
    page_offset: offset,
    page_size: PAGE_SIZE + 1,
  });
  if (error) fail("search results", error);
  return offsetPage(toArticles(data, new Date().toISOString()), asOf, offset);
}

// ---------------------------------------------------------------------------
// Demo mode: the same feeds over the mock stories. Every page is an offset into
// the list, which stays in the same order while the mock feed is cached.

async function demoPage(feed: FeedSpec, cursor: OffsetCursor | null, local: LocalLists): Promise<FeedPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  const asOf = cursor?.asOf ?? new Date().toISOString();
  const offset = cursor?.offset ?? 0;
  const stories = await getMockFeed();
  const inCategory = (category: CategorySlug | null) =>
    category ? stories.filter((article) => article.category === category) : stories;

  let list: Article[];
  switch (feed.kind) {
    case "for-you": {
      const at = Date.parse(asOf);
      list = inCategory(feed.category)
        .map((article) => ({ article, rank: storyRank(article, at, local.topics) }))
        .sort((a, b) => b.rank - a.rank)
        .map(({ article }) => article);
      break;
    }
    case "following":
      list = inCategory(feed.category).filter((article) => local.sources.includes(article.source.id));
      break;
    case "topic":
      list = inCategory(feed.category);
      break;
    case "source":
      list = stories.filter((article) => article.source.id === feed.sourceId);
      if (feed.order === "top") list = [...list].sort((a, b) => b.stats.likes - a.stats.likes);
      break;
    case "search": {
      const query = feed.query.toLowerCase();
      list = stories.filter((article) =>
        [article.title, article.summary, article.category, categoryName(article.category), ...article.tags].some(
          (field) => field.toLowerCase().includes(query),
        ),
      );
      break;
    }
  }
  return offsetPage(list.slice(offset, offset + PAGE_SIZE + 1), asOf, offset);
}
