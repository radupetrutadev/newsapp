import { describe, expect, it } from "vitest";
import {
  htmlToText,
  normalizeItem,
  normalizeUrl,
  shortHash,
  slugify,
  summarize,
  toTags,
} from "./normalize";
import { parseFeed } from "./parse";
import { feedConfig, fixture, NOW } from "./test-helpers";

const items = (name: string) => parseFeed(fixture(name)).items;

describe("normalizeUrl", () => {
  it("strips tracking parameters and fragments but keeps real query params", () => {
    expect(
      normalizeUrl("https://example.com/a?id=7&utm_source=rss&at_medium=RSS&ref=feed#top"),
    ).toBe("https://example.com/a?id=7");
  });

  it("resolves relative links and rejects other protocols", () => {
    expect(normalizeUrl("/story", "https://example.com/feed.xml")).toBe("https://example.com/story");
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("text cleanup", () => {
  it("turns HTML into plain text and decodes entities", () => {
    expect(htmlToText("<p>Rock &amp; roll&#8217;s <b>back</b>&nbsp;&mdash; again</p><script>x()</script>")).toBe(
      "Rock & roll’s back — again",
    );
  });

  it("removes feed boilerplate from summaries", () => {
    expect(summarize('<p>Body text.</p> <a href="#">Continue reading...</a>', "Title")).toBe("Body text.");
    expect(summarize("Body. The post Body appeared first on Example Site.", "Title")).toBe("Body.");
  });

  it("drops summaries that only repeat the title and truncates long ones", () => {
    expect(summarize("Same headline", "Same headline")).toBe("");
    const long = `${"Sentence one is here. ".repeat(10)}${"word ".repeat(60)}`;
    const summary = summarize(long, "Title");
    expect(summary.length).toBeLessThanOrEqual(301);
    expect(summary.endsWith(".") || summary.endsWith("…")).toBe(true);
  });
});

describe("tags and slugs", () => {
  it("turns categories into hashtag-style tags without generic sections", () => {
    expect(toTags(["Artificial intelligence (AI)", "Technology", "World news", "European Union", "Uncategorized"])).toEqual([
      "ArtificialIntelligenceAI",
      "EuropeanUnion",
    ]);
  });

  it("builds readable, stable slugs", () => {
    expect(slugify("Café owner’s plan: 5 new shops!")).toBe("cafe-owners-plan-5-new-shops");
    expect(slugify("日本語のタイトル")).toBe("story");
    expect(shortHash("https://example.com/a")).toBe(shortHash("https://example.com/a"));
    expect(shortHash("https://example.com/a")).not.toBe(shortHash("https://example.com/b"));
  });
});

describe("normalizeItem", () => {
  const feed = feedConfig({ category: "world", sourceId: "src-news" });

  it("maps an RSS item to an article row", () => {
    const row = normalizeItem(items("bbc-style.xml")[0], feed, NOW);
    expect(row).toMatchObject({
      title: "Leaders agree Gaza aid corridor after overnight talks",
      url: "https://news.example.com/world-123",
      summary: "Aid lorries are expected to cross within days, officials say.",
      image_url: "https://images.example.com/240/aid.jpg",
      category: "world",
      source_id: "src-news",
      body: [],
      is_breaking: false,
      published_at: "2026-10-19T09:15:00.000Z",
    });
    expect(row?.slug).toMatch(/^leaders-agree-gaza-aid-corridor-after-overnight-talks-[0-9a-z]{7}$/);
  });

  it("flags and strips a Breaking prefix", () => {
    const row = normalizeItem(items("bbc-style.xml")[1], feed, NOW);
    expect(row?.is_breaking).toBe(true);
    expect(row?.title).toBe("Strong earthquake shakes Pacific coast");
  });

  it("skips items that are too old or have no link", () => {
    const [, , old, noLink] = items("bbc-style.xml");
    expect(normalizeItem(old, feed, NOW)).toBeNull();
    expect(normalizeItem(noLink, feed, NOW)).toBeNull();
  });

  it("clamps future dates to now", () => {
    const item = { ...items("bbc-style.xml")[0], published: "2030-01-01T00:00:00Z" };
    expect(normalizeItem(item, feed, NOW)?.published_at).toBe(NOW.toISOString());
  });

  it("only keeps HTTPS images, falling back to the first image in the content", () => {
    const row = normalizeItem(items("wordpress.xml")[0], feedConfig({ category: "climate" }), NOW);
    expect(row?.image_url).toBe("https://climate.example.org/wp-content/uploads/peak.png");
    expect(row?.title).toBe("Analysis: Why the grid’s winter peak is falling");
    expect(row?.summary).toBe("Heat pumps and batteries are reshaping demand.");
    expect(row?.tags).toEqual(["Energy", "Grid"]);
    expect(row?.read_time_minutes).toBe(4);
  });

  it("keeps HTTPS videos and flags sensitive media", () => {
    const [floods, trial, budget, film] = items("media.xml").map((item) => normalizeItem(item, feed, NOW));
    // A content warning in the description.
    expect(floods).toMatchObject({ video_url: "https://cdn.video.example.com/floods/1280.mp4", is_sensitive: true });
    // Rated adult by the feed.
    expect(trial).toMatchObject({ video_url: "https://cdn.video.example.com/trial.webm", is_sensitive: true });
    expect(budget).toMatchObject({ video_url: null, is_sensitive: false });
    // "Graphic novel" and "disturbing, brilliant" aren't warnings.
    expect(film).toMatchObject({ video_url: null, is_sensitive: false });
    expect(normalizeItem(items("bbc-style.xml")[0], feed, NOW)).toMatchObject({ video_url: null, is_sensitive: false });
  });

  it("decodes HTML in Atom titles and resolves relative Atom links", () => {
    const [first, second] = items("verge-style.atom");
    const atomFeed = feedConfig({ url: "https://gadgets.example.com/rss/index.xml", category: "tech" });
    expect(normalizeItem(first, atomFeed, NOW)).toMatchObject({
      title: "Open-source model tops coding benchmark — again",
      image_url: "https://cdn.example.com/hero.jpg?w=1200&q=80",
      tags: ["AI"],
      published_at: "2026-10-19T12:00:00.000Z",
    });
    expect(normalizeItem(second, atomFeed, NOW)).toMatchObject({
      url: "https://gadgets.example.com/2026/10/19/phone-review",
      summary: "Short summary here.",
    });
  });
});
