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
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { get } from "node:https";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const target = args.shift();
const build = !args.includes("--no-build");
const playwrightArgs = args.filter((arg) => arg !== "--no-build");

if (target !== "demo" && target !== "supabase") {
  console.error("Usage: node scripts/e2e.mjs <demo|supabase> [--no-build] [playwright options]");
  process.exit(1);
}

/** The local API serves HTTPS, like a real project: photo URLs must be https. */
const certs = resolve(root, "e2e/.certs");
const cert = resolve(certs, "cert.pem");
const supabaseEnv = {
  // Paths are relative to the supabase/ folder.
  SUPABASE_API_TLS_ENABLED: "true",
  SUPABASE_API_TLS_CERT_PATH: "../e2e/.certs/cert.pem",
  SUPABASE_API_TLS_KEY_PATH: "../e2e/.certs/key.pem",
};
// The tests don't use these; skipping them makes the stack start faster.
const unusedServices = "studio,edge-runtime,logflare,vector,imgproxy,postgres-meta,supavisor,realtime";

function run(command, commandArgs, env) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit", env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function supabase(commandArgs) {
  return execFileSync("npx", ["supabase", ...commandArgs], {
    cwd: root,
    env: { ...process.env, ...supabaseEnv },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function stackStatus() {
  try {
    return JSON.parse(supabase(["status", "-o", "json"]));
  } catch {
    return null;
  }
}

function makeCertificate() {
  if (existsSync(cert)) return;
  mkdirSync(certs, { recursive: true });
  execFileSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "3650", "-subj", "/CN=localhost",
    "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
    "-keyout", resolve(certs, "key.pem"), "-out", cert,
  ], { stdio: "ignore" });
}

/** Whether the API answers over HTTPS with our certificate. */
function servesHttps(apiUrl) {
  return new Promise((done) => {
    const request = get(new URL("/auth/v1/health", apiUrl), { ca: readFileSync(cert) }, (response) => {
      response.resume();
      done(true);
    });
    request.on("error", () => done(false));
    request.setTimeout(5000, () => request.destroy());
  });
}

async function startStack() {
  makeCertificate();
  let status = stackStatus();
  if (!status) {
    console.log("Starting the local Supabase stack…");
    run("npx", ["supabase", "start", "-x", unusedServices], { ...process.env, ...supabaseEnv });
    status = stackStatus();
  }
  if (!status || !(await servesHttps(status.API_URL))) {
    console.error(
      "The local Supabase stack isn't serving HTTPS. Stop it with `npx supabase stop`, then run this again.",
    );
    process.exit(1);
  }
  return status;
}

// Blank every documented variable first, then fill in the target's values.
const documented = readFileSync(resolve(root, ".env.example"), "utf8")
  .split("\n")
  .map((line) => /^#?\s*([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
  .filter(Boolean);
const env = {
  ...process.env,
  ...Object.fromEntries(documented.map((name) => [name, ""])),
  E2E_TARGET: target,
  NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
  NEXT_TELEMETRY_DISABLED: "1",
};

if (target === "supabase") {
  const status = await startStack();
  Object.assign(env, {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY,
    SUPABASE_SECRET_KEY: status.SECRET_KEY,
    CRON_SECRET: "e2e-cron-secret-not-for-production",
    E2E_MAILPIT_URL: status.MAILPIT_URL ?? status.INBUCKET_URL,
    // The app server and the tests both call the local API.
    NODE_EXTRA_CA_CERTS: cert,
  });
}

// Which target the build in .next was made for, so --no-build can't test the wrong one.
const marker = resolve(root, ".next/e2e-target");
if (build) {
  run("npx", ["next", "build"], env);
  writeFileSync(marker, target);
} else if (!existsSync(marker) || readFileSync(marker, "utf8") !== target) {
  console.error(`The last build wasn't made for "${target}". Run this again without --no-build.`);
  process.exit(1);
}
run("npx", ["playwright", "test", ...playwrightArgs], env);
