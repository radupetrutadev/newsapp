import { test as base, type BrowserContext } from "@playwright/test";

export { expect } from "@playwright/test";

const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const isLocal = (url: URL) => url.hostname === "localhost" || url.hostname === "127.0.0.1";

/**
 * Story photos come from publishers' servers, directly or through the image
 * optimizer. Tests get a blank pixel instead and nothing else leaves the
 * machine, so they never wait on the internet.
 */
export async function keepOffline(context: BrowserContext) {
  await context.route(
    (url) => !isLocal(url) || url.pathname === "/_next/image",
    (route) =>
      route.request().resourceType() === "image"
        ? route.fulfill({ contentType: "image/png", body: PIXEL })
        : route.abort("blockedbyclient"),
  );
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await keepOffline(context);
    await use(context);
  },
});
