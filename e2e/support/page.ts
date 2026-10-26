import { join } from "node:path";
import { expect, type Page } from "@playwright/test";

/** A file in e2e/fixtures. */
export const fixture = (name: string) => join(__dirname, "..", "fixtures", name);

/**
 * Waits until React has hydrated every link and control on the page: clicks
 * before that do nothing. (Waiting for the network to go quiet isn't enough:
 * the unread badge polls, and videos keep their requests open.)
 */
export async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const controls = document.querySelectorAll("a[href], button, input:not([type=hidden]), textarea, select");
    return [...controls].every((element) => Object.keys(element).some((key) => key.startsWith("__reactProps$")));
  });
}

export async function open(page: Page, path: string) {
  await page.goto(path);
  await hydrated(page);
}

export async function reload(page: Page) {
  await page.reload();
  await hydrated(page);
}

/** The feed card that links to a story. */
export function storyCard(page: Page, title: string) {
  return page.locator("article").filter({ has: page.getByRole("link", { name: title, exact: true }) }).first();
}

/** A reply on the story page, by its id. */
export function reply(page: Page, id: string) {
  return page.locator(`#comment-${id}`);
}

/** Posts a reply with the composer that's open (the story's, or the one under "Reply to …"). */
export async function postReply(page: Page, body: string) {
  await page.getByRole("textbox", { name: "Post your reply" }).fill(body);
  await page.getByRole("button", { name: "Reply", exact: true }).click();
}

/** Toasts come and go; this waits for one to show. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible();
}

export async function openReplyMenu(page: Page, id: string) {
  await reply(page, id).getByRole("button", { name: "More options for this reply" }).click();
}

// Playwright's Chromium can't play H.264, so tests serve the demo clip as WebM.
export async function serveDemoVideoAsWebm(page: Page) {
  await page.route("**/demo/aurora.mp4", (route) =>
    route.fulfill({ path: fixture("aurora.webm"), contentType: "video/webm" }),
  );
}
