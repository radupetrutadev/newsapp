import { describe, expect, it } from "vitest";
import { parseFeed } from "./parse";
import { fixture } from "./test-helpers";

describe("parseFeed", () => {
  it("reads RSS 2.0 items with CDATA and media thumbnails", () => {
    const feed = parseFeed(fixture("bbc-style.xml"));
    expect(feed.format).toBe("rss");
    expect(feed.title).toBe("Example News - World");
    expect(feed.items).toHaveLength(4);
    expect(feed.items[0]).toMatchObject({
      title: "Leaders agree Gaza aid corridor after overnight talks",
      link: "https://news.example.com/world-123?at_medium=RSS&at_campaign=rss",
      published: "Sun, 19 Oct 2026 09:15:00 GMT",
      description: "Aid lorries are expected to cross within days, officials say.",
      imageUrl: "https://images.example.com/240/aid.jpg",
    });
    // isPermaLink="false" guids are not used as links.
    expect(feed.items[3].link).toBeNull();
  });

  it("picks the widest media:content image and reads categories and dc:date", () => {
    const [first, second] = parseFeed(fixture("guardian-style.xml")).items;
    expect(first.imageUrl).toBe("https://img.example.com/460/eu.jpg");
    expect(first.published).toBe("2026-10-19T07:30:00Z");
    expect(first.categories).toEqual(["Artificial intelligence (AI)", "Technology", "European Union"]);
    expect(first.description).toContain("<p>The European parliament voted");
    // Video media is not an image.
    expect(second.imageUrl).toBeNull();
  });

  it("reads Atom entries, preferring the alternate link", () => {
    const feed = parseFeed(fixture("verge-style.atom"));
    expect(feed.format).toBe("atom");
    const [first, second] = feed.items;
    expect(first.link).toBe("https://gadgets.example.com/2026/10/19/model");
    expect(first.published).toBe("2026-10-19T08:00:00-04:00");
    expect(first.categories).toEqual(["AI", "News"]);
    expect(first.content).toContain('<img alt="" src="https://cdn.example.com/hero.jpg');
    expect(second.published).toBe("2026-10-19T07:00:00Z");
    expect(second.link).toBe("/2026/10/19/phone-review");
  });

  it("reads RSS 1.0 (RDF) feeds", () => {
    const feed = parseFeed(fixture("rdf.xml"));
    expect(feed.format).toBe("rdf");
    expect(feed.items[0]).toMatchObject({
      title: "Comet will be visible to the naked eye",
      published: "2026-10-19T05:00:00Z",
      categories: ["Astronomy"],
    });
  });

  it("rejects documents that are not feeds", () => {
    expect(() => parseFeed(fixture("not-a-feed.html"))).toThrow("Not an RSS or Atom feed");
  });
});
