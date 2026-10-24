// Triggers one news-ingestion run on a running Pulse server and prints the result.
//
//   npm run ingest                                   (http://localhost:3000)
//   INGEST_URL=https://your-site/api/ingest npm run ingest
//
// Reads CRON_SECRET (and NEXT_PUBLIC_SITE_URL) from the environment or .env.local.

import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("Set CRON_SECRET in .env.local first (generate one with: openssl rand -hex 32).");
  process.exit(1);
}

const url =
  process.env.INGEST_URL ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/api/ingest`;

let response;
try {
  response = await fetch(url, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
} catch (error) {
  console.error(`Could not reach ${url}. Is the app running? (${error.message})`);
  process.exit(1);
}

const report = await response.json().catch(() => null);
if (!response.ok || !report?.feeds) {
  console.error(`Ingestion failed (HTTP ${response.status}): ${report?.error ?? "unexpected response"}`);
  process.exit(1);
}

for (const feed of report.feeds) {
  const detail = feed.status === "error" ? feed.error : `${feed.added} new of ${feed.items}`;
  console.log(`${feed.status.padEnd(12)} ${detail.padEnd(28)} ${feed.url}`);
}
const failed = report.feeds.filter((feed) => feed.status === "error").length;
console.log(
  `\n${report.added} new ${report.added === 1 ? "story" : "stories"} from ${report.feeds.length} feeds` +
    `${failed ? ` (${failed} failed)` : ""}, ${report.trends} trends.`,
);
