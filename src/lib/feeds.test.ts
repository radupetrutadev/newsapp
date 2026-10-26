import { describe, expect, it } from "vitest";
import { feedParams, MAX_QUERY_LENGTH, parseFeedParams, type FeedSpec } from "./feeds";

const parse = (query: string) => parseFeedParams(new URLSearchParams(query));

describe("feedParams / parseFeedParams", () => {
  const feeds: FeedSpec[] = [
    { kind: "for-you", category: null },
    { kind: "for-you", category: "science" },
    { kind: "following", category: null },
    { kind: "following", category: "sports" },
    { kind: "topic", category: "climate" },
    { kind: "source", sourceId: "0b7a3c2e-6f1d-4e8a-9c5b-2d4f6a8b0c1e", order: "latest" },
    { kind: "source", sourceId: "src-circuit", order: "top" },
    { kind: "search", query: "methane & ice, 40%" },
  ];

  it.each(feeds)("round-trips %o", (feed) => {
    expect(parseFeedParams(feedParams(feed))).toEqual(feed);
  });

  it("rejects unknown feeds and topics", () => {
    expect(parse("")).toBeNull();
    expect(parse("feed=trending")).toBeNull();
    expect(parse("feed=for-you&category=cooking")).toBeNull();
    expect(parse("feed=topic")).toBeNull();
  });

  it("rejects incomplete source feeds", () => {
    expect(parse("feed=source&order=top")).toBeNull();
    expect(parse("feed=source&source=abc")).toBeNull();
    expect(parse("feed=source&source=abc&order=oldest")).toBeNull();
    expect(parse(`feed=source&order=top&source=${"x".repeat(65)}`)).toBeNull();
  });

  it("trims searches and rejects empty or very long ones", () => {
    expect(parse("feed=search&q=%20%20moon%20")).toEqual({ kind: "search", query: "moon" });
    expect(parse("feed=search&q=%20")).toBeNull();
    expect(parse(`feed=search&q=${"a".repeat(MAX_QUERY_LENGTH + 1)}`)).toBeNull();
  });
});
