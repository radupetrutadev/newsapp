// Builds the app and runs the Playwright end-to-end tests against it.
//
//   npm run test:e2e             demo mode: no Supabase, the mock data in src/lib/mock
//   npm run test:e2e:supabase    a local Supabase stack in Docker, started if it isn't running
//
// Arguments after `--` go to Playwright: `npm run test:e2e -- --ui`,
// `npm run test:e2e:supabase -- e2e/supabase/replies.spec.ts`. Add --no-build
// to reuse the last build when only the tests changed.
//
// Every variable in .env.example is set here, so a .env.local that points at a
// real project never reaches the build or the tests.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { databaseFingerprint, isolatedEnv, root, run, startStack, trustedCertificates } from "./local-stack.mjs";

const args = process.argv.slice(2);
const target = args.shift();
const build = !args.includes("--no-build");
const playwrightArgs = args.filter((arg) => arg !== "--no-build");

if (target !== "demo" && target !== "supabase") {
  console.error("Usage: node scripts/e2e.mjs <demo|supabase> [--no-build] [playwright options]");
  process.exit(1);
}

const env = {
  ...isolatedEnv(),
  E2E_TARGET: target,
  NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
  NEXT_TELEMETRY_DISABLED: "1",
};

// What the build is made for: pages are prerendered with the database's stories.
let buildFor = target;
if (target === "supabase") {
  const status = await startStack();
  buildFor = `${target} ${await databaseFingerprint(status)}`;
  Object.assign(env, {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: status.SECRET_KEY,
    CRON_SECRET: "e2e-cron-secret-not-for-production",
    E2E_MAILPIT_URL: status.MAILPIT_URL ?? status.INBUCKET_URL,
    // A stand-in for OpenAI's embeddings API (e2e/support/fake-openai.mjs), started by Playwright.
    OPENAI_API_KEY: "e2e-fake-key",
    OPENAI_BASE_URL: "http://127.0.0.1:3101/v1",
    // The app server and the tests both call the local API.
    NODE_EXTRA_CA_CERTS: trustedCertificates(),
  });
}

// What the build in .next was made for, so --no-build can't test the wrong target or database.
const marker = resolve(root, ".next/e2e-target");
if (build) {
  run("npx", ["next", "build"], env);
  writeFileSync(marker, buildFor);
} else if (!existsSync(marker) || readFileSync(marker, "utf8") !== buildFor) {
  console.error(`The last build wasn't made for this ${target === "demo" ? "target" : "database"}. Run this again without --no-build.`);
  process.exit(1);
}
run("npx", ["playwright", "test", ...playwrightArgs], env);
