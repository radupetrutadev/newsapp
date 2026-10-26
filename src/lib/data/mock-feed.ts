import { cacheLife, cacheTag } from "next/cache";
import { mockArticles } from "@/lib/mock/articles";
import { mockSources } from "@/lib/mock/sources";
import type { Article } from "@/lib/types";

/** Demo mode: every mock story, newest first, dated relative to now so the feed looks fresh. */
export async function getMockFeed(): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  const now = Date.now();
  const sources = new Map(mockSources.map((source) => [source.id, source]));
  return mockArticles
    .map(({ sourceId, minutesAgo, videoUrl, isSensitive, ...article }) => ({
      ...article,
      videoUrl: videoUrl ?? null,
      isSensitive: isSensitive ?? false,
      source: sources.get(sourceId)!,
      publishedAt: new Date(now - minutesAgo * 60_000).toISOString(),
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
