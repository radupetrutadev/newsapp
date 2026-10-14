import { cacheLife, cacheTag } from "next/cache";
import { mockArticles } from "@/lib/mock/articles";
import { mockComments, mockNotifications, mockTrends, mockUsers } from "@/lib/mock/community";
import { mockSources } from "@/lib/mock/sources";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPublicClient } from "@/lib/supabase/server";
import type { AppNotification, Article, Comment, Source, Trend } from "@/lib/types";
import {
  mapArticle,
  mapComment,
  mapSource,
  mapTrend,
  type ArticleRow,
  type CommentRow,
} from "./mappers";

/*
 * Public content reads. Each function serves mock data in demo mode and
 * queries Supabase once NEXT_PUBLIC_SUPABASE_* env vars are set. They are
 * cached with "use cache" so pages prerender into the static shell and
 * revalidate every minute.
 */

const ARTICLE_SELECT = "*, source:sources(*)";
const FEED_LIMIT = 100;

function minutesAgo(now: number, minutes: number): string {
  return new Date(now - minutes * 60_000).toISOString();
}

function fail(what: string, error: { message: string }): never {
  throw new Error(`Supabase: failed to load ${what}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Articles

export async function getFeed(): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  if (!isSupabaseConfigured()) {
    const now = Date.now();
    const sources = new Map(mockSources.map((source) => [source.id, source]));
    return mockArticles
      .map(({ sourceId, minutesAgo: age, ...article }) => ({
        ...article,
        source: sources.get(sourceId)!,
        publishedAt: minutesAgo(now, age),
      }))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }

  const { data, error } = await createPublicClient()
    .from("articles")
    .select(ARTICLE_SELECT)
    .order("published_at", { ascending: false })
    .limit(FEED_LIMIT);
  if (error) fail("feed", error);
  return (data as ArticleRow[]).map(mapArticle);
}

export async function getArticle(slug: string): Promise<Article | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles", `article:${slug}`);

  if (!isSupabaseConfigured()) {
    return (await getFeed()).find((article) => article.slug === slug) ?? null;
  }

  const { data, error } = await createPublicClient()
    .from("articles")
    .select(ARTICLE_SELECT)
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail(`article "${slug}"`, error);
  return data ? mapArticle(data as ArticleRow) : null;
}

/** Slugs to prerender at build time. Always returns at least one entry. */
export async function getArticleSlugs(): Promise<string[]> {
  const slugs = (await getFeed()).map((article) => article.slug);
  return slugs.length > 0 ? slugs : ["welcome"];
}

export async function getArticlesByCategory(category: string): Promise<Article[]> {
  return (await getFeed()).filter((article) => article.category === category);
}

export async function getArticlesBySource(sourceId: string): Promise<Article[]> {
  return (await getFeed()).filter((article) => article.source.id === sourceId);
}

export async function getRelatedArticles(article: Article, limit = 3): Promise<Article[]> {
  const feed = await getFeed();
  return feed
    .filter((other) => other.id !== article.id && other.category === article.category)
    .concat(feed.filter((other) => other.id !== article.id && other.category !== article.category))
    .slice(0, limit);
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

  const { data, error } = await createPublicClient()
    .from("sources")
    .select("*")
    .order("followers_count", { ascending: false });
  if (error) fail("sources", error);
  return data.map(mapSource);
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

export async function getComments(articleId: string): Promise<Comment[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`comments:${articleId}`);

  if (!isSupabaseConfigured()) {
    const now = Date.now();
    const users = new Map(mockUsers.map((user) => [user.id, user]));
    return mockComments
      .filter((comment) => comment.articleId === articleId)
      .map(({ authorId, minutesAgo: age, ...comment }) => ({
        ...comment,
        author: users.get(authorId)!,
        createdAt: minutesAgo(now, age),
      }))
      .sort((a, b) => b.likesCount - a.likesCount);
  }

  const { data, error } = await createPublicClient()
    .from("comments")
    .select("*, author:profiles(*)")
    .eq("article_id", articleId)
    .order("likes_count", { ascending: false })
    .limit(50);
  if (error) fail("comments", error);
  return (data as CommentRow[]).map(mapComment);
}

// ---------------------------------------------------------------------------
// Trends, search and notifications

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

export interface SearchResults {
  articles: Article[];
  sources: Source[];
}

export async function search(rawQuery: string): Promise<SearchResults> {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return { articles: [], sources: [] };

  const [feed, sources] = await Promise.all([getFeed(), getSources()]);
  const matches = (...fields: string[]) =>
    fields.some((field) => field.toLowerCase().includes(query));

  return {
    articles: feed.filter((article) =>
      matches(article.title, article.summary, article.category, ...article.tags),
    ),
    sources: sources.filter((source) =>
      matches(source.name, source.handle, source.description, source.category),
    ),
  };
}

/** Notifications are mock-only until per-user activity is stored in Supabase. */
export async function getNotifications(): Promise<AppNotification[]> {
  "use cache";
  cacheLife("minutes");

  const now = Date.now();
  return mockNotifications
    .map(({ minutesAgo: age, ...notification }) => ({
      ...notification,
      createdAt: minutesAgo(now, age),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
