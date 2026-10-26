import { cacheLife, cacheTag } from "next/cache";
import { categoryName } from "@/lib/categories";
import { mockComments, mockTrends, mockUsers, type MockComment } from "@/lib/mock/community";
import { mockSources } from "@/lib/mock/sources";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import type {
  Article,
  CategorySlug,
  Comment,
  PublicProfile,
  Source,
  Trend,
  UserComment,
} from "@/lib/types";
import {
  ARTICLE_SELECT,
  COMMENT_SELECT,
  fail,
  mapArticle,
  mapComment,
  mapPublicProfile,
  mapSource,
  mapTrend,
  type ArticleRow,
  type CommentRow,
} from "./mappers";
import { getMockFeed } from "./mock-feed";

/*
 * Public content reads. Each function serves mock data in demo mode and
 * queries Supabase once NEXT_PUBLIC_SUPABASE_* env vars are set. They are
 * cached with "use cache" so pages prerender into the static shell and
 * revalidate every minute. Feeds that page as the reader scrolls are in
 * ./feeds.ts.
 */

function minutesAgo(now: number, minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

const DAY_MS = 24 * 60 * 60_000;

// ---------------------------------------------------------------------------
// Articles

/**
 * The newest stories. For short lists and lookups, such as stories saved a
 * moment ago that the account hasn't returned yet; feeds page with getFeedPage.
 */
export async function getLatestArticles(limit: number): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  if (!isSupabaseConfigured()) return (await getMockFeed()).slice(0, limit);

  const countedAt = new Date().toISOString();
  const { data, error } = await createPublicClient()
    .from("articles")
    .select(ARTICLE_SELECT)
    .order("published_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) fail("latest stories", error);
  return (data as ArticleRow[]).map((row) => mapArticle(row, countedAt));
}

/** The newest breaking story, for the banner on the home feed. */
export async function getBreakingArticle(): Promise<Article | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  if (!isSupabaseConfigured()) return (await getMockFeed()).find((article) => article.isBreaking) ?? null;

  const countedAt = new Date().toISOString();
  const { data, error } = await createPublicClient()
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("is_breaking", true)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("breaking story", error);
  return data ? mapArticle(data as ArticleRow, countedAt) : null;
}

/** The most-read stories of the last 24 hours. Stories nobody has read are left out. */
export async function getMostReadArticles(limit: number): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  const since = new Date(Date.now() - DAY_MS).toISOString();
  if (!isSupabaseConfigured()) {
    return (await getMockFeed())
      .filter((article) => article.publishedAt >= since && article.stats.views > 0)
      .sort((a, b) => b.stats.views - a.stats.views)
      .slice(0, limit);
  }

  const countedAt = new Date().toISOString();
  const { data, error } = await createPublicClient()
    .from("articles")
    .select(ARTICLE_SELECT)
    .gte("published_at", since)
    .gt("views_count", 0)
    .order("views_count", { ascending: false })
    .limit(limit);
  if (error) fail("most-read stories", error);
  return (data as ArticleRow[]).map((row) => mapArticle(row, countedAt));
}

export async function getArticle(slug: string): Promise<Article | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles", `article:${slug}`);

  if (!isSupabaseConfigured()) {
    return (await getMockFeed()).find((article) => article.slug === slug) ?? null;
  }

  const countedAt = new Date().toISOString();
  const { data, error } = await createPublicClient()
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail(`article "${slug}"`, error);
  return data ? mapArticle(data as ArticleRow, countedAt) : null;
}

/** Slugs to prerender at build time: the newest 100. Always returns at least one entry. */
export async function getArticleSlugs(): Promise<string[]> {
  const slugs = (await getLatestArticles(100)).map((article) => article.slug);
  return slugs.length > 0 ? slugs : ["welcome"];
}

/** The newest other stories in the same topic, topped up with the newest from any topic. */
export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  return getRelated(article.id, article.category, limit);
}

async function getRelated(id: string, category: CategorySlug, limit: number): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  if (!isSupabaseConfigured()) {
    const feed = (await getMockFeed()).filter((other) => other.id !== id);
    return feed
      .filter((other) => other.category === category)
      .concat(feed.filter((other) => other.category !== category))
      .slice(0, limit);
  }

  const countedAt = new Date().toISOString();
  const newest = () =>
    createPublicClient()
      .from("articles")
      .select(ARTICLE_SELECT)
      .neq("id", id)
      .order("published_at", { ascending: false })
      .order("id", { ascending: false });
  const [sameTopic, otherTopics] = await Promise.all([
    newest().eq("category", category).limit(limit),
    newest().neq("category", category).limit(limit),
  ]);
  const error = sameTopic.error ?? otherTopics.error;
  if (error) fail("related stories", error);
  return [...(sameTopic.data as ArticleRow[]), ...(otherTopics.data as ArticleRow[])]
    .slice(0, limit)
    .map((row) => mapArticle(row, countedAt));
}

export interface TopicStats {
  stories: number;
  views: number;
}

/** Stories published and read per topic in the last 24 hours. */
export async function getTopicStats(): Promise<Partial<Record<CategorySlug, TopicStats>>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  const since = new Date(Date.now() - DAY_MS).toISOString();
  const stats: Partial<Record<CategorySlug, TopicStats>> = {};

  if (!isSupabaseConfigured()) {
    for (const article of await getMockFeed()) {
      if (article.publishedAt < since) continue;
      const topic = (stats[article.category] ??= { stories: 0, views: 0 });
      topic.stories += 1;
      topic.views += article.stats.views;
    }
    return stats;
  }

  const { data, error } = await createPublicClient().rpc("topic_stats", { since });
  if (error) fail("topic stats", error);
  for (const row of data) stats[row.category as CategorySlug] = { stories: row.stories, views: row.views };
  return stats;
}

/** How many stories a source has published in all. */
export async function getSourceStoryCount(sourceId: string): Promise<number> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  if (!isSupabaseConfigured()) {
    return (await getMockFeed()).filter((article) => article.source.id === sourceId).length;
  }

  const { count, error } = await createPublicClient()
    .from("articles")
    .select("id", { count: "exact", head: true })
    .eq("source_id", sourceId);
  if (error) fail("story count", error);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Sources

export async function getSources(): Promise<Source[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("sources");

  if (!isSupabaseConfigured()) {
    return [...mockSources].sort((a, b) => b.followersCount - a.followersCount);
  }

  const countedAt = new Date().toISOString();
  const { data, error } = await createPublicClient()
    .from("sources")
    .select("*")
    .order("followers_count", { ascending: false });
  if (error) fail("sources", error);
  return data.map((row) => mapSource(row, countedAt));
}

export async function getSource(handle: string): Promise<Source | null> {
  const normalized = handle.toLowerCase();
  return (await getSources()).find((source) => source.handle === normalized) ?? null;
}

export async function getSourceHandles(): Promise<string[]> {
  const handles = (await getSources()).map((source) => source.handle);
  return handles.length > 0 ? handles : ["pulse"];
}

// ---------------------------------------------------------------------------
// Comments

/**
 * Comments on a story, most liked first. Read on every request rather than
 * cached, so a reply shows up straight away, also for the person a
 * notification sends to it. Call after `connection()` (see the story page).
 */
export async function getComments(articleId: string): Promise<Comment[]> {
  if (!isSupabaseConfigured()) {
    return mockComments
      .filter((comment) => comment.articleId === articleId)
      .map(fromMock(Date.now()))
      .sort((a, b) => b.likesCount - a.likesCount);
  }

  const countedAt = new Date().toISOString();
  const { data, error } = await createPublicClient()
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("article_id", articleId)
    .order("likes_count", { ascending: false })
    .limit(50);
  if (error) fail("comments", error);
  return (data as unknown as CommentRow[]).map((row) => mapComment(row, countedAt));
}

function fromMock(now: number) {
  const users = new Map(mockUsers.map((user) => [user.id, user]));
  return ({ authorId, minutesAgo: age, ...comment }: MockComment): Comment => ({
    ...comment,
    author: users.get(authorId)!,
    parentId: null,
    replyToHandle: null,
    createdAt: minutesAgo(now, age),
  });
}

// ---------------------------------------------------------------------------
// Readers' public pages

const DEMO_JOINED_AT = "2025-06-01T00:00:00.000Z";

export async function getUserProfile(rawHandle: string): Promise<PublicProfile | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("profiles");

  const handle = rawHandle.toLowerCase();
  if (!isSupabaseConfigured()) {
    const user = mockUsers.find((candidate) => candidate.handle === handle);
    return user ? { ...user, followersCount: 0, joinedAt: DEMO_JOINED_AT } : null;
  }
  // Handles are 3–15 letters, digits or underscores; anything else can't match.
  if (!/^[a-z0-9_]{3,15}$/.test(handle)) return null;

  const countedAt = new Date().toISOString();
  const { data, error } = await createPublicClient().from("profiles").select("*").eq("handle", handle).maybeSingle();
  if (error) fail(`profile "${handle}"`, error);
  return data ? mapPublicProfile(data, countedAt) : null;
}

/**
 * Handles to prerender reader pages for. Real readers' pages render on
 * request; Cache Components needs one handle to check the route at build
 * time, so this placeholder (which finds nobody) stands in.
 */
export function getUserHandles(): string[] {
  return isSupabaseConfigured() ? ["__placeholder__"] : mockUsers.map((user) => user.handle);
}

/** A reader's newest comments, with the story each is on. */
export async function getUserComments(userId: string, limit = 30): Promise<UserComment[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`user-comments:${userId}`);

  if (!isSupabaseConfigured()) {
    const articles = new Map((await getMockFeed()).map((article) => [article.id, article]));
    return mockComments
      .filter((comment) => comment.authorId === userId)
      .map(fromMock(Date.now()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((comment) => {
        const article = articles.get(comment.articleId);
        return { ...comment, article: article ? { slug: article.slug, title: article.title } : null };
      });
  }

  const countedAt = new Date().toISOString();
  const { data, error } = await createPublicClient()
    .from("comments")
    .select(`${COMMENT_SELECT}, article:articles(slug, title)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("comments", error);
  return (data as unknown as (CommentRow & { article: UserComment["article"] })[]).map((row) => ({
    ...mapComment(row, countedAt),
    article: row.article,
  }));
}

// ---------------------------------------------------------------------------
// Trends and search

export async function getTrends(): Promise<Trend[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("trends");

  if (!isSupabaseConfigured()) return mockTrends;

  const { data, error } = await createPublicClient()
    .from("trends")
    .select("*")
    .order("position", { ascending: true })
    .limit(10);
  if (error) fail("trends", error);
  return data.map(mapTrend);
}

/**
 * Sources whose name, handle, description or topic contain the query. There
 * are only a few dozen publishers, so this filters the cached list; stories are
 * searched in the database (getFeedPage with a "search" feed).
 */
export async function searchSources(rawQuery: string): Promise<Source[]> {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  return (await getSources()).filter((source) =>
    [source.name, source.handle, source.description, source.category, categoryName(source.category)].some(
      (field) => field.toLowerCase().includes(query),
    ),
  );
}
