import type { Article, Coverage } from "@/lib/types";

/*
 * "Full coverage": stories different publishers wrote about the same event
 * share a cluster (src/lib/ingest/cluster.ts finds them).
 */

/** Keeps the first story of each event and drops the rest, in order. */
export function onePerEvent(articles: Article[]): Article[] {
  const seen = new Set<string>();
  return articles.filter((article) => {
    const cluster = article.coverage?.clusterId;
    if (!cluster) return true;
    if (seen.has(cluster)) return false;
    seen.add(cluster);
    return true;
  });
}

/** "4 sources", or "2 stories" when one publisher wrote them all. */
export function coverageLabel(coverage: Coverage): string {
  return coverage.sources > 1 ? `${coverage.sources} sources` : `${coverage.stories} stories`;
}
