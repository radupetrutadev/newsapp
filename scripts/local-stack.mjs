// The local Supabase stack the end-to-end tests and the search evaluation use:
// Docker, every migration, then supabase/seed.sql, with the API on HTTPS.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { get } from "node:https";
import { resolve } from "node:path";

export const root = resolve(import.meta.dirname, "..");

/** The local API serves HTTPS, like a real project: photo URLs must be https. */
const certs = resolve(root, "e2e/.certs");
export const cert = resolve(certs, "cert.pem");
const supabaseEnv = {
  // Paths are relative to the supabase/ folder.
  SUPABASE_API_TLS_ENABLED: "true",
  SUPABASE_API_TLS_CERT_PATH: "../e2e/.certs/cert.pem",
  SUPABASE_API_TLS_KEY_PATH: "../e2e/.certs/key.pem",
};
// The tests don't use these; skipping them makes the stack start faster.
const unusedServices = "studio,edge-runtime,logflare,vector,imgproxy,postgres-meta,supavisor,realtime";

/** Runs a command in the project, exiting with its status if it fails. */
export function run(command, commandArgs, env = process.env) {
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

/**
 * For NODE_EXTRA_CA_CERTS: our certificate, plus any CA bundle already set
 * there (a company or sandbox proxy, say), so outside HTTPS keeps working.
 */
export function trustedCertificates() {
  makeCertificate();
  const existing = process.env.NODE_EXTRA_CA_CERTS;
  if (!existing || resolve(existing) === cert || !existsSync(existing)) return cert;
  const bundle = resolve(certs, "bundle.pem");
  writeFileSync(bundle, `${readFileSync(existing, "utf8").trimEnd()}\n${readFileSync(cert, "utf8")}`);
  return bundle;
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

/**
 * Tells databases apart: the id of the first story by id. Ids are random, so
 * it changes when the database is recreated (`supabase stop --no-backup`).
 */
export function databaseFingerprint(status) {
  const url = new URL("/rest/v1/articles?select=id&order=id&limit=1", status.API_URL);
  return new Promise((done, fail) => {
    const request = get(url, { ca: readFileSync(cert), headers: { apikey: status.SECRET_KEY } }, (response) => {
      let body = "";
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => done(JSON.parse(body)[0]?.id ?? "empty"));
    });
    request.on("error", fail);
  });
}

/** Starts the stack if it isn't running, and returns `supabase status` (URLs and keys). */
export async function startStack() {
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

/**
 * The environment with every variable in .env.example blanked, so a .env.local
 * that points at a real project never reaches what runs with it.
 */
export function isolatedEnv() {
  const documented = readFileSync(resolve(root, ".env.example"), "utf8")
    .split("\n")
    .map((line) => /^#?\s*([A-Z][A-Z0-9_]*)=/.exec(line)?.[1])
    .filter(Boolean);
  return { ...process.env, ...Object.fromEntries(documented.map((name) => [name, ""])) };
}
