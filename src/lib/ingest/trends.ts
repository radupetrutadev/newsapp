import { categoryName } from "@/lib/categories";
import type { CategorySlug } from "@/lib/types";
import type { TrendInput, TrendRow } from "./types";

/*
 * "What's happening" from real coverage: a topic trends when several stories
 * mention it, ranked by how many different sources cover it.
 *
 * Candidate topics come from feed tags and from proper-noun phrases in
 * sentence-case headlines ("EU agrees new Gaza aid plan" → "EU", "Gaza").
 * Title Case headlines capitalize every word, so they can't nominate
 * topics, but they still count towards topics found elsewhere.
 */

// Capitalized words that are not news topics.
const stopwords = new Set(
  (
    "a an and are as at be but by for from has have he her his how i if in into is it its " +
    "live watch video analysis opinion review explainer exclusive update updates breaking " +
    "latest new news says said why what when where who will with you your our we they this " +
    "that these those after before over under more most first last top best report reports " +
    "mr mrs ms dr sir us uk monday tuesday wednesday thursday friday saturday sunday " +
    "january february march april may june july august september october november december"
  ).split(" "),
);

interface Candidate {
  label: string;
  key: string;
  /** Match against titles case-sensitively, as written. */
  pattern: RegExp | null;
}

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "Gaza", "McDonald's", "NASA", "G7" — but not plain numbers like "30". */
function isCapitalized(word: string) {
  return /^[A-Z][A-Za-z'’.-]*$/.test(word) || /^(?=.*[A-Z])[A-Z0-9]{2,}$/.test(word);
}

// Title Case styles leave these lower-case even when they are four letters or more.
const titleCaseLowercase = new Set(
  (
    "about above across after against along amid among around before behind below beneath " +
    "beside between beyond despite during except from inside into like near onto outside over " +
    "past since than that through toward towards under until upon versus with within without"
  ).split(" "),
);

/**
 * Sentence case ("Strikes hit Gaza City overnight") has lower-case content
 * words; Title Case ("Fed Holds Rates Steady as Inflation Cools") does not.
 */
function isSentenceCase(words: string[]) {
  return words
    .slice(1)
    .some((word) => /^[a-z]{4,}$/.test(word) && !titleCaseLowercase.has(word));
}

/** Runs of capitalized words after the first word, e.g. "White House", "Premier League". */
export function properNounPhrases(title: string): string[] {
  const words = title
    .replace(/[“”"‘’:;,!?()[\]]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/['’]s$/, "").replace(/[.]$/, ""))
    .filter(Boolean);
  if (!isSentenceCase(words)) return [];

  const phrases: string[] = [];
  let run: string[] = [];
  const flush = () => {
    while (run.length && stopwords.has(run[0].toLowerCase())) run.shift();
    while (run.length && stopwords.has(run[run.length - 1].toLowerCase())) run.pop();
    if (run.length > 0 && run.length <= 3) {
      const phrase = run.join(" ");
      if (phrase.replace(/[^A-Za-z0-9]/g, "").length >= 2) phrases.push(phrase);
    }
    run = [];
  };

  words.forEach((word, index) => {
    if (index > 0 && isCapitalized(word)) run.push(word);
    else flush();
  });
  flush();
  return phrases;
}

function candidatesFrom(articles: TrendInput[]): Candidate[] {
  const byKey = new Map<string, Candidate>();
  const add = (label: string, fromTitle: boolean) => {
    const key = normalizeKey(label);
    if (key.length < 2 || stopwords.has(key)) return;
    const existing = byKey.get(key);
    // Prefer the readable headline spelling ("Open Source AI") over a tag ("OpenSourceAI").
    if (existing && (existing.pattern || !fromTitle)) return;
    byKey.set(key, {
      label: fromTitle ? label : `#${label}`,
      key,
      pattern: fromTitle ? new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(label)}([^A-Za-z0-9]|$)`) : null,
    });
  };

  for (const article of articles) {
    for (const tag of article.tags) add(tag, false);
    for (const phrase of properNounPhrases(article.title)) add(phrase, true);
  }
  return [...byKey.values()];
}

function mentions(candidate: Candidate, article: TrendInput) {
  if (article.tags.some((tag) => normalizeKey(tag) === candidate.key)) return true;
  return candidate.pattern ? candidate.pattern.test(article.title) : false;
}

function topCategory(articles: TrendInput[]): CategorySlug {
  const counts = new Map<CategorySlug, number>();
  for (const article of articles) counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export function computeTrends(articles: TrendInput[], limit = 8): TrendRow[] {
  const scored = candidatesFrom(articles)
    .map((candidate) => {
      const matching = articles.filter((article) => mentions(candidate, article));
      const sources = new Set(matching.map((article) => article.sourceId)).size;
      return { candidate, matching, sources };
    })
    // At least two stories, from two sources or three stories from one.
    .filter(({ matching, sources }) => matching.length >= 3 || (matching.length >= 2 && sources >= 2))
    .sort(
      (a, b) =>
        b.sources - a.sources ||
        b.matching.length - a.matching.length ||
        a.candidate.label.localeCompare(b.candidate.label),
    );

  const trends: TrendRow[] = [];
  const taken: string[] = [];
  for (const { candidate, matching } of scored) {
    // Skip "Gaza City" when "Gaza" already trends, and vice versa.
    if (taken.some((key) => key.includes(candidate.key) || candidate.key.includes(key))) continue;
    taken.push(candidate.key);
    const category = topCategory(matching);
    trends.push({
      context: `${categoryName(category)} · Trending`,
      topic: candidate.label,
      posts_count: matching.length,
      category,
    });
    if (trends.length === limit) return trends;
  }

  // Not enough named topics: fill with the most-covered categories.
  const byCategory = new Map<CategorySlug, number>();
  for (const article of articles) byCategory.set(article.category, (byCategory.get(article.category) ?? 0) + 1);
  for (const [category, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
    if (trends.length === limit) break;
    trends.push({
      context: "Most covered · Last 24 hours",
      topic: categoryName(category),
      posts_count: count,
      category,
    });
  }
  return trends;
}
