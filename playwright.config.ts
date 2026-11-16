import { defineConfig, devices } from "@playwright/test";

// scripts/e2e.mjs builds the app for the target and sets its environment, so
// run the tests through it: `npm run test:e2e` or `npm run test:e2e:supabase`.
const target = process.env.E2E_TARGET;
if (target !== "demo" && target !== "supabase") {
  throw new Error("Run the end-to-end tests with `npm run test:e2e` or `npm run test:e2e:supabase`.");
}

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: `e2e/${target}`,
  outputDir: `test-results/${target}`,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // Failures keep their trace instead of being retried away.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    [process.env.CI ? "github" : "list"],
    ["html", { open: "never", outputFolder: `playwright-report/${target}` }],
  ],
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The local Supabase stack serves HTTPS with a self-signed certificate.
    ignoreHTTPSErrors: target === "supabase",
  },
  projects:
    target === "demo"
      ? [
          { name: "desktop", use: devices["Desktop Chrome"] },
          { name: "phone", use: devices["Pixel 7"] },
        ]
      : [{ name: "desktop", use: devices["Desktop Chrome"] }],
  webServer: [
    {
      command: `npx next start --port ${port}`,
      url: baseURL,
      // Never test against a dev server that may be connected to a real project.
      reuseExistingServer: false,
      stdout: "ignore",
      stderr: "pipe",
    },
    // Stands in for OpenAI's embeddings API (see scripts/e2e.mjs).
    ...(target === "supabase"
      ? [{ command: "node e2e/support/fake-openai.mjs 3101", url: "http://127.0.0.1:3101/health", reuseExistingServer: false }]
      : []),
  ],
});
