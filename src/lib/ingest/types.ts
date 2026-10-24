import type { Database } from "@/lib/supabase/database.types";
import type { CategorySlug } from "@/lib/types";

/** A feed to poll, as stored in the `feeds` table. */
export interface FeedConfig {
  id: string;
  url: string;
  sourceId: string;
  category: CategorySlug;
  etag: string | null;
  lastModified: string | null;
}

export type ArticleInsert = Database["public"]["Tables"]["articles"]["Insert"];
export type FeedUpdate = Database["public"]["Tables"]["feeds"]["Update"];

/** The fields trend detection needs from recent articles. */
export interface TrendInput {
  title: string;
  tags: string[];
  category: CategorySlug;
  sourceId: string;
}

export interface TrendRow {
  context: string;
  topic: string;
  posts_count: number;
  category: CategorySlug;
}

/** Persistence used by the ingestion run; Supabase in production, fakes in tests. */
export interface IngestStore {
  listFeeds(): Promise<FeedConfig[]>;
  /** Inserts new articles, skipping URLs already stored. Returns how many were added. */
  insertArticles(rows: ArticleInsert[]): Promise<number>;
  updateFeed(id: string, patch: FeedUpdate): Promise<void>;
  /** Clears the breaking flag on stories published before `before` (ISO date). */
  expireBreaking(before: string): Promise<void>;
  recentArticles(since: string): Promise<TrendInput[]>;
  replaceTrends(rows: TrendRow[]): Promise<void>;
}

export interface FeedResult {
  feedId: string;
  url: string;
  status: "ok" | "not-modified" | "error";
  /** Items in the feed that were recent enough and valid to store. */
  items: number;
  added: number;
  error?: string;
}

export interface IngestReport {
  startedAt: string;
  finishedAt: string;
  feeds: FeedResult[];
  added: number;
  trends: number;
}
