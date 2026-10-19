import { describe, expect, it } from "vitest";
import { computeTrends, properNounPhrases } from "./trends";
import type { TrendInput } from "./types";

const story = (title: string, sourceId: string, overrides: Partial<TrendInput> = {}): TrendInput => ({
  title,
  sourceId,
  tags: [],
  category: "world",
  ...overrides,
});

describe("properNounPhrases", () => {
  it("finds proper nouns in sentence-case headlines", () => {
    expect(properNounPhrases("Leaders agree Gaza aid corridor after talks in Cairo")).toEqual(["Gaza", "Cairo"]);
    expect(properNounPhrases("Fans celebrate as Premier League title race tightens")).toEqual(["Premier League"]);
    expect(properNounPhrases("Live: NASA delays Artemis launch")).toEqual(["NASA", "Artemis"]);
  });

  it("ignores numbers but keeps acronyms with digits", () => {
    expect(properNounPhrases("Marathon record falls by 30 seconds")).toEqual([]);
    expect(properNounPhrases("Leaders arrive for G7 summit")).toEqual(["G7"]);
  });

  it("ignores Title Case headlines, where every word is capitalized", () => {
    expect(properNounPhrases("Fed Holds Interest Rates Steady as Inflation Cools")).toEqual([]);
  });
});

describe("computeTrends", () => {
  it("ranks topics by how many sources cover them", () => {
    const trends = computeTrends([
      story("Leaders agree Gaza aid corridor", "bbc"),
      story("Aid convoy reaches Gaza at dawn", "guardian"),
      story("What The Gaza Deal Means For Aid Groups", "npr"),
      story("Ministers meet in Cairo", "bbc"),
      story("Talks resume in Cairo", "bbc"),
      story("Chipmaker results lift Nvidia shares", "ledger", { category: "business" }),
    ]);
    expect(trends[0]).toEqual({
      context: "World · Trending",
      topic: "Gaza",
      posts_count: 3,
      category: "world",
    });
    // Two stories from one source are not enough; Nvidia appears once.
    expect(trends.map((trend) => trend.topic)).not.toContain("Cairo");
    expect(trends.map((trend) => trend.topic)).not.toContain("Nvidia");
  });

  it("uses tags and prefers the headline spelling when both match", () => {
    const trends = computeTrends([
      story("Lawmakers back rules for chatbots", "a", { tags: ["ArtificialIntelligence"], category: "tech" }),
      story("Startups react to chatbot rules", "b", { tags: ["ArtificialIntelligence"], category: "tech" }),
      story("Researchers test Open Source AI models", "c", { tags: ["OpenSourceAI"], category: "tech" }),
      story("Benchmarks favour Open Source AI", "d", { category: "tech" }),
    ]);
    expect(trends.slice(0, 2).map((trend) => trend.topic)).toEqual(["#ArtificialIntelligence", "Open Source AI"]);
    expect(trends[0].context).toBe("Technology · Trending");
  });

  it("keeps only the stronger of overlapping topics", () => {
    const trends = computeTrends([
      story("Strikes hit Gaza City overnight", "a"),
      story("Families leave Gaza City", "b"),
      story("Aid enters Gaza", "c"),
    ]);
    const topics = trends.map((trend) => trend.topic);
    expect(topics).toContain("Gaza");
    expect(topics).not.toContain("Gaza City");
  });

  it("falls back to the most-covered categories", () => {
    const trends = computeTrends([
      story("Quiet day on the markets", "a", { category: "business" }),
      story("Shares edge higher", "b", { category: "business" }),
      story("New phone announced", "c", { category: "tech" }),
    ]);
    expect(trends).toEqual([
      { context: "Most covered · Last 24 hours", topic: "Business", posts_count: 2, category: "business" },
      { context: "Most covered · Last 24 hours", topic: "Technology", posts_count: 1, category: "tech" },
    ]);
  });

  it("returns nothing without recent stories", () => {
    expect(computeTrends([])).toEqual([]);
  });
});
