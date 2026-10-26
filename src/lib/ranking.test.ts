import { describe, expect, it } from "vitest";
import { mockSources } from "./mock/sources";
import { storyRank } from "./ranking";
import type { Article, ArticleStats } from "./types";

const now = Date.parse("2026-10-26T12:00:00Z");
const noEngagement: ArticleStats = { likes: 0, reposts: 0, comments: 0, views: 0 };

function story(
  hoursAgo: number,
  stats: Partial<ArticleStats> = {},
  category: Article["category"] = "tech",
  sources = 1,
): Article {
  return {
    id: "a",
    slug: "a",
    source: mockSources[0],
    title: "",
    summary: "",
    body: [],
    imageUrl: null,
    videoUrl: null,
    url: null,
    category,
    tags: [],
    isBreaking: false,
    isSensitive: false,
    readTimeMinutes: 3,
    stats: { ...noEngagement, ...stats },
    coverage: sources > 1 ? { clusterId: "c", stories: sources, sources } : null,
    publishedAt: new Date(now - hoursAgo * 3_600_000).toISOString(),
  };
}

describe("storyRank", () => {
  it("matches the formula in public.for_you_feed", () => {
    // Same inputs as a query against the migration's expression.
    const article = story(3, { likes: 100, reposts: 10, comments: 5, views: 2_000 });
    expect(storyRank(article, now, ["tech"])).toBeCloseTo(1.1562853848929946, 12);
    expect(storyRank(story(0), now, [])).toBeCloseTo(0.3535533905932738, 12);
    const covered = story(3, { likes: 100, reposts: 10, comments: 5, views: 2_000 }, "tech", 3);
    expect(storyRank(covered, now, ["tech"])).toBeCloseTo(1.79144005141838, 12);
  });

  it("ranks newer stories higher", () => {
    expect(storyRank(story(1), now, [])).toBeGreaterThan(storyRank(story(5), now, []));
  });

  it("doubles stories in followed topics", () => {
    const article = story(2, { likes: 40 });
    expect(storyRank(article, now, ["tech"])).toBeCloseTo(2 * storyRank(article, now, ["sports"]), 12);
  });

  it("lifts engaging stories, with diminishing returns", () => {
    const quiet = storyRank(story(4), now, []);
    const liked = storyRank(story(4, { likes: 1_000 }), now, []);
    const viral = storyRank(story(4, { likes: 100_000 }), now, []);
    expect(liked).toBeGreaterThan(quiet);
    expect(viral - liked).toBeLessThan(liked - quiet);
  });

  it("lifts stories more publishers cover, with diminishing returns", () => {
    const [one, two, three] = [1, 2, 3].map((sources) => storyRank(story(2, { likes: 40 }, "tech", sources), now, []));
    expect(two).toBeCloseTo(one * (1 + 0.5 * Math.log(2)), 12);
    expect(three - two).toBeLessThan(two - one);
  });

  it("treats stories dated in the future as brand new", () => {
    expect(storyRank(story(-2), now, [])).toBe(storyRank(story(0), now, []));
  });
});
