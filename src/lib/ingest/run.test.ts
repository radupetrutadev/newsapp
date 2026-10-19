import { describe, expect, it } from "vitest";
import { runIngest } from "./run";
import { feedConfig, fixture, NOW } from "./test-helpers";
import type { ArticleInsert, FeedConfig, FeedUpdate, IngestStore, TrendInput, TrendRow } from "./types";

/** In-memory store with the same "skip known URLs" rule as the database. */
function memoryStore(feeds: FeedConfig[]) {
  const articles: ArticleInsert[] = [];
  const feedUpdates = new Map<string, FeedUpdate>();
  const calls = { expireBreaking: [] as string[], replaceTrends: [] as TrendRow[][] };

  const store: IngestStore = {
    async listFeeds() {
      return feeds;
    },
    async insertArticles(rows) {
      const fresh = rows.filter((row) => !articles.some((stored) => stored.url === row.url));
      articles.push(...fresh);
      return fresh.length;
    },
    async updateFeed(id, patch) {
      feedUpdates.set(id, { ...feedUpdates.get(id), ...patch });
    },
    async expireBreaking(before) {
      calls.expireBreaking.push(before);
    },
    async recentArticles(): Promise<TrendInput[]> {
      return articles.map((article) => ({
        title: article.title,
        tags: article.tags ?? [],
        category: article.category as TrendInput["category"],
        sourceId: article.source_id,
      }));
    },
    async replaceTrends(rows) {
      calls.replaceTrends.push(rows);
    },
  };
  return { store, articles, feedUpdates, calls };
}

type Responder = (init: RequestInit | undefined) => Response;

function fakeFetch(routes: Record<string, Responder>) {
  const requests: { url: string; init: RequestInit | undefined }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    const route = routes[url];
    if (!route) throw new TypeError("fetch failed");
    return route(init);
  }) as typeof fetch;
  return { fetchImpl, requests };
}

const xml = (body: string, headers: Record<string, string> = {}) =>
  new Response(body, { status: 200, headers: { "content-type": "application/rss+xml", ...headers } });

describe("runIngest", () => {
  it("stores new stories from every feed and reports per-feed results", async () => {
    const feeds = [
      feedConfig({ id: "world", url: "https://feeds.example.com/world.xml", sourceId: "news" }),
      feedConfig({ id: "tech", url: "https://feeds.example.com/tech.xml", sourceId: "daily", category: "tech" }),
      feedConfig({ id: "down", url: "https://feeds.example.com/down.xml" }),
      feedConfig({ id: "html", url: "https://feeds.example.com/moved.xml" }),
      feedConfig({ id: "offline", url: "https://offline.example.com/feed.xml" }),
    ];
    const { store, articles, feedUpdates, calls } = memoryStore(feeds);
    const { fetchImpl } = fakeFetch({
      "https://feeds.example.com/world.xml": () => xml(fixture("bbc-style.xml"), { etag: '"v1"' }),
      "https://feeds.example.com/tech.xml": () => xml(fixture("guardian-style.xml")),
      "https://feeds.example.com/down.xml": () => new Response("oops", { status: 500 }),
      "https://feeds.example.com/moved.xml": () => xml(fixture("not-a-feed.html")),
    });

    const report = await runIngest(store, { fetch: fetchImpl, now: NOW });

    expect(report.added).toBe(4);
    expect(report.feeds.map(({ feedId, status, added }) => ({ feedId, status, added }))).toEqual([
      { feedId: "world", status: "ok", added: 2 },
      { feedId: "tech", status: "ok", added: 2 },
      { feedId: "down", status: "error", added: 0 },
      { feedId: "html", status: "error", added: 0 },
      { feedId: "offline", status: "error", added: 0 },
    ]);
    expect(report.feeds[2].error).toBe("HTTP 500");
    expect(report.feeds[3].error).toBe("Not an RSS or Atom feed");
    expect(report.feeds[4].error).toBe("fetch failed");

    expect(articles.map((article) => article.category)).toEqual(["world", "world", "tech", "tech"]);
    expect(feedUpdates.get("world")).toMatchObject({ etag: '"v1"', last_error: null });
    expect(feedUpdates.get("down")).toMatchObject({ last_error: "HTTP 500", last_fetched_at: NOW.toISOString() });
    expect(feedUpdates.get("down")).not.toHaveProperty("last_success_at");

    // Breaking flags older than 6 hours are cleared and trends refreshed.
    expect(calls.expireBreaking).toEqual(["2026-10-19T06:00:00.000Z"]);
    expect(report.trends).toBeGreaterThan(0);
    expect(calls.replaceTrends[0][0].topic).toBe("Gaza");
  });

  it("does not store a story twice", async () => {
    const feeds = [feedConfig({ id: "world", url: "https://feeds.example.com/world.xml" })];
    const { store, articles } = memoryStore(feeds);
    const { fetchImpl } = fakeFetch({
      "https://feeds.example.com/world.xml": () => xml(fixture("bbc-style.xml")),
    });

    await runIngest(store, { fetch: fetchImpl, now: NOW });
    const second = await runIngest(store, { fetch: fetchImpl, now: NOW });

    expect(articles).toHaveLength(2);
    expect(second.added).toBe(0);
    expect(second.feeds[0]).toMatchObject({ status: "ok", items: 2, added: 0 });
  });

  it("sends conditional headers and handles 304 Not Modified", async () => {
    const feeds = [
      feedConfig({ id: "world", etag: '"v1"', lastModified: "Sun, 19 Oct 2026 10:00:00 GMT" }),
    ];
    const { store, feedUpdates, calls } = memoryStore(feeds);
    const { fetchImpl, requests } = fakeFetch({
      [feeds[0].url]: () => new Response(null, { status: 304 }),
    });

    const report = await runIngest(store, { fetch: fetchImpl, now: NOW, userAgent: "TestBot" });

    const headers = requests[0].init?.headers as Record<string, string>;
    expect(headers["if-none-match"]).toBe('"v1"');
    expect(headers["if-modified-since"]).toBe("Sun, 19 Oct 2026 10:00:00 GMT");
    expect(headers["user-agent"]).toBe("TestBot");
    expect(report.feeds[0]).toMatchObject({ status: "not-modified", added: 0 });
    expect(feedUpdates.get("world")).toMatchObject({ last_error: null, last_success_at: NOW.toISOString() });
    // Nothing recent: the previous trends are kept.
    expect(calls.replaceTrends).toEqual([]);
  });
});
