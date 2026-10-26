import { cacheLife, cacheTag } from "next/cache";
import { assignClusters } from "@/lib/ingest/cluster";
import { mockArticles } from "@/lib/mock/articles";
import { mockSources } from "@/lib/mock/sources";
import type { Article, Coverage } from "@/lib/types";

/**
 * Demo mode: every mock story, newest first, dated relative to now so the feed
 * looks fresh. Stories about the same event are clustered the way ingestion
 * clusters real ones.
 */
export async function getMockFeed(): Promise<Article[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");

  const now = Date.now();
  const sources = new Map(mockSources.map((source) => [source.id, source]));
  const articles: Article[] = mockArticles.map(({ sourceId, minutesAgo, videoUrl, isSensitive, ...article }) => ({
    ...article,
    videoUrl: videoUrl ?? null,
    isSensitive: isSensitive ?? false,
    coverage: null,
    source: sources.get(sourceId)!,
    publishedAt: new Date(now - minutesAgo * 60_000).toISOString(),
  }));

  const byId = new Map(articles.map((article) => [article.id, article]));
  const assignments = assignClusters(articles.map((article) => ({ ...article, clusterId: null })));
  for (const { articleIds } of assignments) {
    const members = articleIds.map((id) => byId.get(id)!);
    const coverage: Coverage = {
      clusterId: `cluster-${articleIds[0]}`,
      stories: members.length,
      sources: new Set(members.map((member) => member.source.id)).size,
    };
    for (const member of members) member.coverage = coverage;
  }

  return articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
