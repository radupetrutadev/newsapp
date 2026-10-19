import { readFileSync } from "node:fs";
import type { FeedConfig } from "./types";

export const NOW = new Date("2026-10-19T12:00:00Z");

export function fixture(name: string): string {
  return readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), "utf8");
}

export function feedConfig(overrides: Partial<FeedConfig> = {}): FeedConfig {
  return {
    id: "feed-1",
    url: "https://feeds.example.com/world.xml",
    sourceId: "source-1",
    category: "world",
    etag: null,
    lastModified: null,
    ...overrides,
  };
}
