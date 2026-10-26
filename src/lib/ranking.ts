import type { Article } from "@/lib/types";

/**
 * How high a story ranks in "For you". Newer stories rank higher. Likes,
 * reposts, replies and reads lift a story, with diminishing returns, and so
 * does coverage by more publishers. Stories in the reader's topics count
 * double.
 *
 * Demo mode ranks with this; the database uses the same formula in
 * public.for_you_feed. Keep the two in sync.
 */
export function storyRank(article: Article, asOf: number, topics: readonly string[]): number {
  const { likes, reposts, comments, views } = article.stats;
  const hours = Math.max((asOf - Date.parse(article.publishedAt)) / 3_600_000, 0);
  const topicBoost = topics.includes(article.category) ? 2 : 1;
  const engagement = 1 + Math.log(1 + likes + 2 * reposts + 3 * comments + views / 20);
  const coverage = 1 + 0.5 * Math.log(Math.max(article.coverage?.sources ?? 1, 1));
  return (topicBoost * engagement * coverage) / Math.pow(hours + 2, 1.5);
}
