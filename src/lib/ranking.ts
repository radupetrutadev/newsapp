import type { Article } from "@/lib/types";

/** What a reader opened recently. */
export interface ReadingHistory {
  read: ReadonlySet<string>;
  /** The share of their recent reads in each topic, 0–1. */
  topicShare: ReadonlyMap<string, number>;
}

/** History reaches back this many reads, as in public.for_you_feed. */
export const HISTORY_SIZE = 50;

/** The history of the stories with these ids, newest read first. Ids of stories that are gone are skipped. */
export function readingHistory(readIds: readonly string[], stories: readonly Article[]): ReadingHistory {
  const byId = new Map(stories.map((story) => [story.id, story]));
  const recent = [...new Set(readIds)].flatMap((id) => byId.get(id) ?? []).slice(0, HISTORY_SIZE);
  const counts = new Map<string, number>();
  for (const story of recent) counts.set(story.category, (counts.get(story.category) ?? 0) + 1);
  return {
    read: new Set(recent.map((story) => story.id)),
    topicShare: new Map([...counts].map(([topic, count]) => [topic, count / recent.length])),
  };
}

/**
 * How high a story ranks in "For you". Newer stories rank higher. Likes,
 * reposts, replies and reads lift a story, with diminishing returns, and so
 * does coverage by more publishers. Stories in the reader's topics count
 * double.
 *
 * With the reader's history, stories they've read keep a quarter of their
 * rank, and the rest rise by up to double, by the share of their reads in the
 * story's topic. (The database uses closeness in meaning instead when stories
 * have embeddings, which demo stories don't.)
 *
 * Demo mode ranks with this; the database uses the same formula in
 * public.for_you_feed. Keep the two in sync.
 */
export function storyRank(
  article: Article,
  asOf: number,
  topics: readonly string[],
  history?: ReadingHistory,
): number {
  const { likes, reposts, comments, views } = article.stats;
  const hours = Math.max((asOf - Date.parse(article.publishedAt)) / 3_600_000, 0);
  const topicBoost = topics.includes(article.category) ? 2 : 1;
  const engagement = 1 + Math.log(1 + likes + 2 * reposts + 3 * comments + views / 20);
  const coverage = 1 + 0.5 * Math.log(Math.max(article.coverage?.sources ?? 1, 1));
  const personal = !history
    ? 1
    : history.read.has(article.id)
      ? 0.25
      : 1 + (history.topicShare.get(article.category) ?? 0);
  return (topicBoost * engagement * coverage * personal) / Math.pow(hours + 2, 1.5);
}
