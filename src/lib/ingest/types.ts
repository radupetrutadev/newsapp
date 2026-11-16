import type { Database } from "@/lib/supabase/database.types";
import type { CategorySlug } from "@/lib/types";
import type { ClusterAssignment, ClusterInput } from "./cluster";

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

/** A story to embed (see src/lib/search/openai.ts). */
export interface EmbeddingInput {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  category: string;
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
  /** Stories published since `since` (ISO date), with their cluster if they have one. */
  clusterCandidates(since: string): Promise<ClusterInput[]>;
  /** Saves new clusters and stories joining clusters. Returns how many stories moved. */
  saveClusters(assignments: ClusterAssignment[]): Promise<number>;
  /** Up to `limit` stories without an embedding, newest first. */
  articlesToEmbed(limit: number): Promise<EmbeddingInput[]>;
  saveEmbeddings(items: { id: string; embedding: number[] }[]): Promise<number>;
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
  /** Stories put in a cluster with others about the same event. */
  clustered: number;
  clusterError?: string;
  /** Stories given an embedding, for search by meaning and "For you". */
  embedded: number;
  embedError?: string;
  trends: number;
}
