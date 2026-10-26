import { assignClusters } from "./cluster";
import { normalizeItem } from "./normalize";
import { parseFeed } from "./parse";
import { computeTrends } from "./trends";
import type { ArticleInsert, FeedConfig, FeedResult, IngestReport, IngestStore } from "./types";

const MAX_ITEMS_PER_FEED = 30;
const MAX_FEED_BYTES = 5_000_000;
const FETCH_TIMEOUT_MS = 15_000;
/** Breaking flags expire so the Live banner never shows an old story. */
const BREAKING_HOURS = 6;
const TRENDS_WINDOW_HOURS = 24;
/** Feeds only offer stories up to three days old (see normalize.ts). */
const CLUSTER_WINDOW_HOURS = 72;

export interface IngestOptions {
  fetch?: typeof fetch;
  now?: Date;
  concurrency?: number;
  userAgent?: string;
}

/**
 * Polls every active feed, stores new stories, clusters stories about the
 * same event, then refreshes trends. One failing feed never stops the run;
 * its error is saved on the feed row.
 */
export async function runIngest(store: IngestStore, options: IngestOptions = {}): Promise<IngestReport> {
  const fetchImpl = options.fetch ?? fetch;
  const now = options.now ?? new Date();
  const startedAt = now.toISOString();

  const feeds = await store.listFeeds();
  const results = await mapWithConcurrency(feeds, options.concurrency ?? 4, (feed) =>
    ingestFeed(store, feed, { fetchImpl, now, userAgent: options.userAgent ?? "PulseBot/1.0" }),
  );

  await store.expireBreaking(hoursBefore(now, BREAKING_HOURS));

  // New stories can join an event already covered, or pair up with one that had no match yet.
  let clustered = 0;
  let clusterError: string | undefined;
  try {
    const assignments = assignClusters(await store.clusterCandidates(hoursBefore(now, CLUSTER_WINDOW_HOURS)));
    if (assignments.length > 0) clustered = await store.saveClusters(assignments);
  } catch (cause) {
    // The stories are stored either way; the next run tries again.
    clusterError = describeError(cause);
  }

  const recent = await store.recentArticles(hoursBefore(now, TRENDS_WINDOW_HOURS));
  const trends = computeTrends(recent);
  // Keep the previous list rather than blanking it when nothing is recent.
  if (trends.length > 0) await store.replaceTrends(trends);

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    feeds: results,
    added: results.reduce((total, result) => total + result.added, 0),
    clustered,
    ...(clusterError ? { clusterError } : {}),
    trends: trends.length,
  };
}

async function ingestFeed(
  store: IngestStore,
  feed: FeedConfig,
  context: { fetchImpl: typeof fetch; now: Date; userAgent: string },
): Promise<FeedResult> {
  const fetchedAt = context.now.toISOString();
  try {
    const response = await context.fetchImpl(feed.url, {
      headers: {
        "user-agent": context.userAgent,
        accept:
          "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
        ...(feed.etag ? { "if-none-match": feed.etag } : {}),
        ...(feed.lastModified ? { "if-modified-since": feed.lastModified } : {}),
      },
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status === 304) {
      await store.updateFeed(feed.id, {
        last_fetched_at: fetchedAt,
        last_success_at: fetchedAt,
        last_error: null,
      });
      return { feedId: feed.id, url: feed.url, status: "not-modified", items: 0, added: 0 };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_FEED_BYTES) throw new Error("Feed is larger than 5 MB");
    const xml = await response.text();
    if (xml.length > MAX_FEED_BYTES) throw new Error("Feed is larger than 5 MB");

    const rows = uniqueByUrl(
      parseFeed(xml)
        .items.slice(0, MAX_ITEMS_PER_FEED)
        .map((item) => normalizeItem(item, feed, context.now))
        .filter((row): row is ArticleInsert => row !== null),
    );
    const added = await store.insertArticles(rows);

    await store.updateFeed(feed.id, {
      last_fetched_at: fetchedAt,
      last_success_at: fetchedAt,
      last_error: null,
      etag: response.headers.get("etag"),
      last_modified: response.headers.get("last-modified"),
    });
    return { feedId: feed.id, url: feed.url, status: "ok", items: rows.length, added };
  } catch (cause) {
    const error = describeError(cause);
    await store.updateFeed(feed.id, { last_fetched_at: fetchedAt, last_error: error }).catch(() => {});
    return { feedId: feed.id, url: feed.url, status: "error", items: 0, added: 0, error };
  }
}

function uniqueByUrl(rows: ArticleInsert[]): ArticleInsert[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row.url || seen.has(row.url)) return false;
    seen.add(row.url);
    return true;
  });
}

function describeError(cause: unknown): string {
  if (cause instanceof Error) {
    if (cause.name === "TimeoutError") return `Timed out after ${FETCH_TIMEOUT_MS / 1000}s`;
    return cause.message.slice(0, 500);
  }
  return String(cause).slice(0, 500);
}

function hoursBefore(date: Date, hours: number): string {
  return new Date(date.getTime() - hours * 3_600_000).toISOString();
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
