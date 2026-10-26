import { describe, expect, it } from "vitest";
import { mockSources } from "./mock/sources";
import { storyRank } from "./ranking";
import type { Article, ArticleStats } from "./types";

const now = Date.parse("2026-10-26T12:00:00Z");
const noEngagement: ArticleStats = { likes: 0, reposts: 0, comments: 0, views: 0 };

function story(hoursAgo: number, stats: Partial<ArticleStats> = {}, category: Article["category"] = "tech"): Article {
  return {
    id: "a",
    slug: "a",
    source: mockSources[0],
    title: "",
    summary: "",
    body: [],
    imageUrl: null,
    url: null,
    category,
    tags: [],
    isBreaking: false,
    readTimeMinutes: 3,
    stats: { ...noEngagement, ...stats },
    publishedAt: new Date(now - hoursAgo * 3_600_000).toISOString(),
  };
}

describe("storyRank", () => {
  it("matches the formula in public.for_you_feed", () => {
    // Same inputs as a query against the migration's expression.
    const article = story(3, { likes: 100, reposts: 10, comments: 5, views: 2_000 });
    expect(storyRank(article, now, ["tech"])).toBeCloseTo(1.1562853848929946, 12);
    expect(storyRank(story(0), now, [])).toBeCloseTo(0.3535533905932738, 12);
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

  it("treats stories dated in the future as brand new", () => {
    expect(storyRank(story(-2), now, [])).toBe(storyRank(story(0), now, []));
  });
});
