/*
 * Story clustering: finds the stories different publishers wrote about the
 * same event, for "Full coverage", and so "For you" shows each event once.
 *
 * Stories are compared by their distinctive words. Each one becomes a TF-IDF
 * vector of its headline and tags (counted twice) and summary. Words most
 * stories in the window use, like "says" or "government", weigh little; rare
 * ones weigh a lot, and names and figures (capitalized mid-sentence, or with
 * digits) count double. Similarity is the cosine between two vectors.
 *
 * Clustering is incremental, oldest story first. A story joins the group
 * whose combined vector it's most similar to, if that similarity reaches
 * CLUSTER_THRESHOLD and the group spans to within CLUSTER_GAP_HOURS of it;
 * otherwise it starts a group of its own, and gets a second chance once all
 * groups have formed. Stories already in a cluster stay there, so links keep
 * working; only the others are placed. Groups of one aren't clusters.
 *
 * The threshold comes from the hand-labeled stories in __fixtures__/clusters.ts
 * (see cluster.test.ts): at 0.275 every pair it joins belongs together and it
 * finds 96% of the pairs that do; wrong merges start at 0.225.
 *
 * No imports at run time: scripts/generate-seed.mjs loads this file with plain Node.
 */

export interface ClusterInput {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  publishedAt: string;
  clusterId: string | null;
}

/** Stories to put in `clusterId`, or in a new cluster together when it's null. */
export interface ClusterAssignment {
  clusterId: string | null;
  articleIds: string[];
}

export const CLUSTER_THRESHOLD = 0.275;
export const CLUSTER_GAP_HOURS = 36;

const HEADLINE_WEIGHT = 2;
const TAG_WEIGHT = 2;
const NAME_WEIGHT = 2;

// Words that say nothing about which event a story is about.
const stopwords = new Set(
  (
    "a about above after again against ago all also am an and any are as at be because been before being " +
    "below between both but by can could did do does doing down during each few for from further had has " +
    "have having he her here hers him his how i if in into is it its just me more most my no nor not now " +
    "of off on once only or other our out over own same she should so some such than that the their them " +
    "then there these they this those through to too under until up us very was we were what when where " +
    "which while who whom why will with would you your " +
    // News filler.
    "says said say according new news report reports reported latest live update updates watch video " +
    "photos analysis opinion explainer exclusive breaking first last year years week weeks day days " +
    "today yesterday tomorrow time times amid set sets get gets got make makes made take takes took " +
    "one two three four five six seven eight nine ten per cent percent"
  ).split(" "),
);

/** Plurals to the singular, lightly: "rates" → "rate", "policies" → "policy". */
function stem(word: string): string {
  if (/^\d/.test(word)) return word;
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ss|sh|ch|x|z)es$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !/(ss|us|is)$/.test(word)) return word.slice(0, -1);
  return word;
}

/** The words of a text that can tell stories apart, normalized. */
export function terms(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]s\b/g, "")
    // "40,000" is one figure; "1.8" stays apart from "18".
    .replace(/(\d),(\d{3})/g, "$1$2")
    .replace(/(\d)\.(\d)/g, "$1_$2")
    .split(/[^a-z0-9_]+/)
    .filter((word) => word.length >= 2 && !stopwords.has(word))
    .map(stem);
}

/** "MethaneDeal" → "Methane Deal", so tags share words with headlines. */
const splitTag = (tag: string) => tag.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

type Vector = Map<string, number>;

/** Terms of the words that name something: capitalized mid-sentence ("Athens", "FDA"), or figures ("7.1"). */
function names(text: string): Set<string> {
  const found = new Set<string>();
  let sentenceStart = true;
  for (const word of text.split(/\s+/)) {
    if (/\d/.test(word) || (!sentenceStart && /^[“"‘'(]?[A-Z]/.test(word))) {
      for (const term of terms(word)) found.add(term);
    }
    sentenceStart = /[.!?:]["”’)]?$/.test(word);
  }
  return found;
}

function termCounts(story: ClusterInput): Vector {
  const counts: Vector = new Map();
  const add = (text: string, weight: number) => {
    const named = names(text);
    for (const term of terms(text)) {
      counts.set(term, (counts.get(term) ?? 0) + weight * (named.has(term) ? NAME_WEIGHT : 1));
    }
  };
  add(story.title, HEADLINE_WEIGHT);
  add(story.tags.map(splitTag).join(" "), TAG_WEIGHT);
  add(story.summary, 1);
  return counts;
}

function norm(vector: Vector): number {
  let sum = 0;
  for (const value of vector.values()) sum += value * value;
  return Math.sqrt(sum);
}

/** Unit-length TF-IDF vectors, one per story, with IDF taken over these stories. */
export function storyVectors(stories: ClusterInput[]): Vector[] {
  const counts = stories.map(termCounts);
  const documents = new Map<string, number>();
  for (const vector of counts) for (const term of vector.keys()) documents.set(term, (documents.get(term) ?? 0) + 1);

  return counts.map((vector) => {
    const weighted: Vector = new Map();
    for (const [term, count] of vector) weighted.set(term, count * Math.log(1 + stories.length / documents.get(term)!));
    const length = norm(weighted) || 1;
    for (const [term, value] of weighted) weighted.set(term, value / length);
    return weighted;
  });
}

export function cosine(a: Vector, b: Vector): number {
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, value] of small) dot += value * (large.get(term) ?? 0);
  const lengths = norm(a) * norm(b);
  return lengths ? dot / lengths : 0;
}

interface Group {
  clusterId: string | null;
  members: string[];
  placed: string[];
  oldest: number;
  newest: number;
  /** Sum of the members' vectors. */
  centroid: Vector;
  length: number;
}

const HOUR = 3_600_000;

/**
 * Places the stories that have no cluster yet. Returns only what changed:
 * stories joining an existing cluster, and new clusters of two or more.
 */
export function assignClusters(stories: ClusterInput[]): ClusterAssignment[] {
  const ordered = [...stories].sort(
    (a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || a.id.localeCompare(b.id),
  );
  const vectors = storyVectors(ordered);
  const groups: Group[] = [];
  // Which groups use a word, so a story is only compared with groups it shares words with.
  const postings = new Map<string, Set<Group>>();

  const add = (group: Group, index: number) => {
    const story = ordered[index];
    const at = Date.parse(story.publishedAt);
    group.members.push(story.id);
    group.oldest = Math.min(group.oldest, at);
    group.newest = Math.max(group.newest, at);
    for (const [term, value] of vectors[index]) {
      group.centroid.set(term, (group.centroid.get(term) ?? 0) + value);
      let users = postings.get(term);
      if (!users) postings.set(term, (users = new Set()));
      users.add(group);
    }
    group.length = norm(group.centroid);
  };
  const newGroup = (clusterId: string | null): Group => {
    const group = { clusterId, members: [], placed: [], oldest: Infinity, newest: -Infinity, centroid: new Map(), length: 0 };
    groups.push(group);
    return group;
  };

  /** The group most similar to a story, if any is similar and close enough in time. */
  const bestGroup = (index: number, own: Group | null): Group | null => {
    const at = Date.parse(ordered[index].publishedAt);
    const dots = new Map<Group, number>();
    for (const [term, value] of vectors[index]) {
      for (const group of postings.get(term) ?? []) {
        if (group !== own) dots.set(group, (dots.get(group) ?? 0) + value * (group.centroid.get(term) ?? 0));
      }
    }
    let best: Group | null = null;
    let bestScore = CLUSTER_THRESHOLD;
    for (const [group, dot] of dots) {
      if (group.members.length === 0) continue;
      if (at < group.oldest - CLUSTER_GAP_HOURS * HOUR || at > group.newest + CLUSTER_GAP_HOURS * HOUR) continue;
      const score = dot / group.length;
      if (score >= bestScore && (!best || score > bestScore)) {
        best = group;
        bestScore = score;
      }
    }
    return best;
  };

  const existing = new Map<string, Group>();
  ordered.forEach((story, index) => {
    if (!story.clusterId) return;
    let group = existing.get(story.clusterId);
    if (!group) existing.set(story.clusterId, (group = newGroup(story.clusterId)));
    add(group, index);
  });

  const alone = new Map<Group, number>();
  ordered.forEach((story, index) => {
    if (story.clusterId) return;
    let group = bestGroup(index, null);
    if (!group) alone.set((group = newGroup(null)), index);
    add(group, index);
    group.placed.push(story.id);
  });

  // A story placed early can miss a group that only took shape after it.
  // Stories still on their own get another chance against the final groups.
  for (let moved = true; moved; ) {
    moved = false;
    for (const [own, index] of alone) {
      if (own.members.length !== 1) {
        alone.delete(own);
        continue;
      }
      const group = bestGroup(index, own);
      if (!group) continue;
      Object.assign(own, { members: [], placed: [], centroid: new Map(), length: 0 });
      alone.delete(own);
      add(group, index);
      group.placed.push(ordered[index].id);
      moved = true;
    }
  }

  return groups
    .filter((group) => group.placed.length > 0 && group.members.length >= 2)
    .map((group) => ({
      clusterId: group.clusterId,
      articleIds: group.clusterId ? group.placed : group.members,
    }));
}
