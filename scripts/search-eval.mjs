// Measures search quality on the test queries in src/lib/search/eval-queries.ts,
// over the demo stories in the local Supabase stack: full-text search alone,
// then full-text fused with search by meaning, as the app searches.
//
//   OPENAI_API_KEY=sk-… npm run search:eval   both, with real embeddings
//   npm run search:eval                       full-text only, without a key
//
// It embeds every story in the local database (the demo stories are about 40
// short texts) and each query: a fraction of a cent. Prints a Markdown report,
// also written to the GitHub Actions job summary when run there.
import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { evalQueries, unrelatedQuery } from "../src/lib/search/eval-queries.ts";
import { embed, normalizeQuery, storyText, toVector } from "../src/lib/search/openai.ts";
import { startStack, trustedCertificates } from "./local-stack.mjs";

// The local API's certificate has to be trusted before Node starts.
if (!process.env.E2E_CERTIFICATES_TRUSTED) {
  await startStack();
  const child = spawnSync(process.execPath, [...process.execArgv, import.meta.filename, ...process.argv.slice(2)], {
    stdio: "inherit",
    env: { ...process.env, NODE_EXTRA_CA_CERTS: trustedCertificates(), E2E_CERTIFICATES_TRUSTED: "1" },
  });
  process.exit(child.status ?? 1);
}

const status = await startStack();
const db = createClient(status.API_URL, status.SECRET_KEY, { auth: { persistSession: false } });
const apiKey = process.env.OPENAI_API_KEY;
const config = apiKey ? { apiKey, baseUrl: process.env.OPENAI_BASE_URL || undefined } : null;
const TOP = 10;

const { data: stories, error } = await db.from("articles").select("id, slug, title, summary, tags, category").limit(1000);
if (error) throw new Error(error.message);
const slugs = new Set(stories.map((story) => story.slug));
const missing = evalQueries.flatMap((item) => item.relevant).filter((slug) => !slugs.has(slug));
if (missing.length > 0) {
  console.error(`The local database is missing demo stories (${missing.join(", ")}). Load supabase/seed.sql.`);
  process.exit(1);
}

if (config) {
  // Embeddings from the end-to-end tests' stand-in may be there; replace them all.
  const vectors = await embed(stories.map(storyText), config);
  const items = stories.map((story, index) => ({ id: story.id, embedding: vectors[index] }));
  const { error: saveError } = await db.rpc("set_article_embeddings", { items });
  if (saveError) throw new Error(saveError.message);
}

async function search(query, queryEmbedding, minSimilarity) {
  const { data, error: searchError } = await db.rpc("search_articles", {
    query,
    as_of: new Date().toISOString(),
    page_offset: 0,
    page_size: TOP,
    query_embedding: queryEmbedding,
    // The function's default unless sweeping.
    ...(minSimilarity === undefined ? {} : { min_similarity: minSimilarity }),
  });
  if (searchError) throw new Error(searchError.message);
  return data.map((story) => story.slug);
}

/** The 1-based rank of the first relevant story, and how many relevant stories came back. */
function grade(results, relevant) {
  const first = results.findIndex((slug) => relevant.includes(slug));
  return {
    rank: first === -1 ? null : first + 1,
    found: relevant.filter((slug) => results.includes(slug)).length,
    returned: results.length,
  };
}

function summary(grades) {
  const relevant = evalQueries.reduce((total, item) => total + item.relevant.length, 0);
  const inTop3 = grades.filter((g) => g.rank !== null && g.rank <= 3).length;
  const mrr = grades.reduce((total, g) => total + (g.rank ? 1 / g.rank : 0), 0) / grades.length;
  const found = grades.reduce((total, g) => total + g.found, 0);
  return { inTop3: `${inTop3} / ${grades.length}`, mrr: mrr.toFixed(2), found: `${Math.round((100 * found) / relevant)}%` };
}

const queryVectors = config
  ? (await embed([...evalQueries.map((item) => item.query), unrelatedQuery].map(normalizeQuery), config)).map(toVector)
  : [];
const rows = [];
for (const [index, item] of evalQueries.entries()) {
  rows.push({
    ...item,
    words: grade(await search(item.query, null), item.relevant),
    both: config ? grade(await search(item.query, queryVectors[index]), item.relevant) : null,
  });
}

const columns = config ? ["Full-text", "Full-text + meaning"] : ["Full-text"];
const words = summary(rows.map((row) => row.words));
const both = config ? summary(rows.map((row) => row.both)) : null;
const metric = (label, key) => `| ${label} | ${words[key]} |${both ? ` ${both[key]} |` : ""}`;
const rank = (g) => (g.rank ? `${g.rank}` : "—");

const lines = [
  `## Search: ${rows.length} test queries over the demo stories`,
  "",
  `| | ${columns.join(" | ")} |`,
  `|---|${columns.map(() => "---").join("|")}|`,
  metric("First relevant story in the top 3", "inTop3"),
  metric(`Mean reciprocal rank (top ${TOP})`, "mrr"),
  metric(`Relevant stories found (top ${TOP})`, "found"),
  "",
  `| Query | Kind | ${columns.map((column) => `${column}: rank`).join(" | ")} |`,
  `|---|---|${columns.map(() => "---").join("|")}|`,
  ...rows.map((row) => `| ${row.query} | ${row.kind} | ${rank(row.words)} |${row.both ? ` ${rank(row.both)} |` : ""}`),
  "",
];

if (config) {
  // How the cut-off for meaning matches (min_similarity in public.search_articles) trades off.
  lines.push(
    `Rank is the position of the first relevant story; — means none in the top ${TOP}.`,
    "",
    "| Minimum similarity | First relevant in the top 3 | Mean reciprocal rank | Results per query | Results for an unrelated query |",
    "|---|---|---|---|---|",
  );
  for (const minSimilarity of [0.2, 0.25, 0.3, 0.35, 0.4, 0.5]) {
    const grades = [];
    for (const [index, item] of evalQueries.entries()) {
      grades.push(grade(await search(item.query, queryVectors[index], minSimilarity), item.relevant));
    }
    const unrelated = await search(unrelatedQuery, queryVectors.at(-1), minSimilarity);
    const perQuery = grades.reduce((total, g) => total + g.returned, 0) / grades.length;
    const { inTop3, mrr } = summary(grades);
    lines.push(`| ${minSimilarity} | ${inTop3} | ${mrr} | ${perQuery.toFixed(1)} | ${unrelated.length} |`);
  }
} else {
  lines.push("Set OPENAI_API_KEY to compare with search by meaning.");
}

const report = lines.join("\n");
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
