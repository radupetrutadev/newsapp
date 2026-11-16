import { describe, expect, it } from "vitest";
import { mockArticles } from "@/lib/mock/articles";
import { evalQueries } from "./eval-queries";

describe("evalQueries", () => {
  it("only expects demo stories that exist", () => {
    const slugs = new Set(mockArticles.map((article) => article.slug));
    for (const { query, relevant } of evalQueries) {
      expect(relevant.length, query).toBeGreaterThan(0);
      for (const slug of relevant) expect(slugs.has(slug), `${query}: ${slug}`).toBe(true);
    }
  });
});
