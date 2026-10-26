import { categories } from "@/lib/categories";
import type { ParsedItem } from "./parse";
import type { ArticleInsert, FeedConfig } from "./types";

/** Items older than this are skipped, so a new feed doesn't import its whole archive. */
export const MAX_ITEM_AGE_DAYS = 3;
const SUMMARY_LENGTH = 300;
const MAX_TAGS = 5;
const WORDS_PER_MINUTE = 230;

const namedEntities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  laquo: "«",
  raquo: "»",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  euro: "€",
  pound: "£",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return namedEntities[entity.toLowerCase()] ?? match;
  });
}

/** HTML → plain text: drops scripts/styles and tags, decodes entities, collapses whitespace. */
export function htmlToText(html: string): string {
  const withoutBlocks = html
    .replace(/<(script|style|figure|figcaption|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6])>/gi, " ");
  return decodeEntities(withoutBlocks.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

// Boilerplate that feeds append to descriptions.
const trailers = [
  /\s*The post .{1,200} appeared first on .{1,120}\.?$/i,
  /\s*(Continue reading|Read more|Read the full story|Keep reading)\s*(…|\.{3}|»|→)?\s*$/i,
  /\s*\[(…|\.{3}|&hellip;)\]\s*$/,
];

/** Plain-text summary, cut at a word boundary. */
export function summarize(html: string | null, title: string): string {
  if (!html) return "";
  let summary = htmlToText(html);
  for (const trailer of trailers) summary = summary.replace(trailer, "");
  summary = summary.trim();
  if (!summary || summary.toLowerCase() === title.toLowerCase()) return "";
  if (summary.length <= SUMMARY_LENGTH) return summary;

  const cut = summary.slice(0, SUMMARY_LENGTH);
  const sentenceEnd = cut.lastIndexOf(". ");
  if (sentenceEnd > SUMMARY_LENGTH * 0.6) return cut.slice(0, sentenceEnd + 1);
  const wordEnd = cut.lastIndexOf(" ");
  return `${cut.slice(0, wordEnd > 0 ? wordEnd : SUMMARY_LENGTH).replace(/[,;:\s]+$/, "")}…`;
}

const trackingParams = /^(utm_\w+|at_\w+|cmp|cmpid|ito|xtor|ref|src|ns_\w+|ocid|fbclid|gclid|mc_cid|mc_eid)$/i;

/** Absolute http(s) URL without tracking parameters or fragment; null if invalid. */
export function normalizeUrl(raw: string | null, base?: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim(), base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (trackingParams.test(key)) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

/** Only HTTPS images and videos are kept, so pages never load mixed content. */
export function normalizeMediaUrl(raw: string | null, base: string): string | null {
  const url = normalizeUrl(raw ? decodeEntities(raw) : null, base);
  if (!url) return null;
  return url.startsWith("https://") ? url : null;
}

export function firstImageInHtml(html: string | null): string | null {
  if (!html) return null;
  const match = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/i.exec(html);
  return match ? match[1] : null;
}

export function slugify(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 72)
      .replace(/-+$/, "") || "story"
  );
}

/** FNV-1a, base36 — a short stable suffix that keeps slugs unique per URL. */
export function shortHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

// Section names that say nothing beyond the article's category.
const genericTags = new Set(
  [
    "news",
    "world",
    "world news",
    "us news",
    "uk news",
    "latest",
    "top stories",
    "home",
    "opinion",
    "analysis",
    "features",
    "feature",
    "video",
    "videos",
    "podcast",
    "podcasts",
    "uncategorized",
    "general",
    "sport",
    "sports",
    "culture",
    "environment",
    "society",
    "media",
    ...categories.flatMap((category) => [category.slug, category.name.toLowerCase()]),
  ].map((tag) => tag.replace(/[^a-z0-9]/g, "")),
);

/** "Artificial intelligence (AI)" → "ArtificialIntelligenceAI"; drops generic section names. */
export function toTags(raw: string[]): string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    const words = decodeEntities(value)
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean);
    const tag = words.map((word) => word[0].toUpperCase() + word.slice(1)).join("");
    const key = tag.toLowerCase();
    if (tag.length < 2 || tag.length > 24 || genericTags.has(key) || seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length === MAX_TAGS) break;
  }
  return tags;
}

const breakingPrefix = /^(?:breaking(?:\s+news)?)\s*[:\-–—|]\s*/i;

// Feeds rarely rate their media, but headlines and standfirsts warn about it.
const contentWarning =
  /\b(?:graphic (?:content|images?|footage|videos?|scenes|warning)|(?:disturbing|distressing) (?:images?|footage|videos?|content|scenes)|viewer discretion)\b|\bwarning:\s*(?:this|graphic|distressing|disturbing)\b/i;

/** Whether a story's media should be blurred for readers who hide sensitive content. */
export function isSensitive(item: ParsedItem, title: string, summary: string): boolean {
  return item.ratedAdult || contentWarning.test(title) || contentWarning.test(summary);
}

function readTime(content: string | null): number {
  if (!content) return 3;
  const words = htmlToText(content).split(" ").filter(Boolean).length;
  if (words < 120) return 3;
  return Math.min(30, Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)));
}

function publishedAt(raw: string | null, now: Date): Date | null {
  const parsed = raw ? new Date(raw) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed > now) return now;
  const oldest = now.getTime() - MAX_ITEM_AGE_DAYS * 86_400_000;
  return parsed.getTime() < oldest ? null : parsed;
}

/**
 * Turns a feed item into an `articles` row, or null when it should be skipped
 * (no title or link, or too old). Only the headline, a short summary, an
 * image and the link are stored; readers follow the link for the full story.
 */
export function normalizeItem(item: ParsedItem, feed: FeedConfig, now: Date): ArticleInsert | null {
  const url = normalizeUrl(item.link, feed.url);
  let title = htmlToText(item.title);
  if (!url || !title) return null;

  const date = publishedAt(item.published, now);
  if (!date) return null;

  const isBreaking = breakingPrefix.test(title);
  if (isBreaking) title = title.replace(breakingPrefix, "");

  const image =
    normalizeMediaUrl(item.imageUrl, url) ??
    normalizeMediaUrl(firstImageInHtml(item.content ?? item.description), url);
  const summary = summarize(item.description ?? item.content, title);

  return {
    slug: `${slugify(title)}-${shortHash(url)}`,
    source_id: feed.sourceId,
    title,
    summary,
    body: [],
    image_url: image,
    video_url: normalizeMediaUrl(item.videoUrl, url),
    url,
    category: feed.category,
    tags: toTags(item.categories),
    is_breaking: isBreaking,
    is_sensitive: isSensitive(item, title, summary),
    read_time_minutes: readTime(item.content),
    published_at: date.toISOString(),
  };
}
