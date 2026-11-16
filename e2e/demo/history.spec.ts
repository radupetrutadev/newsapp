import type { Page } from "@playwright/test";
import { expect, test } from "../support/test";
import { open } from "../support/page";

/** The headlines in "For you", in order, and whether each story has full coverage. */
async function forYou(page: Page) {
  await open(page, "/");
  const cards = page.getByRole("main").locator("article");
  await expect(cards.first()).toBeVisible();
  return cards.evaluateAll((articles) =>
    articles.map((article) => ({
      title: article.querySelector(":scope > a[aria-label]")?.getAttribute("aria-label") ?? "",
      covered: article.textContent?.includes("Full coverage") ?? false,
    })),
  );
}

test("For you learns from the stories opened in this browser, unless that's off", async ({ page }) => {
  const before = await forYou(page);
  const index = before.findIndex((story, at) => at >= 2 && story.title && !story.covered);
  const [read, next] = [before[index].title, before[index + 1].title];
  const readBelowNext = async () => {
    const titles = (await forYou(page)).map((story) => story.title);
    // Read stories may sink past the first page.
    const at = titles.indexOf(read);
    return at === -1 || at > titles.indexOf(next);
  };

  await page.getByRole("main").getByRole("link", { name: read, exact: true }).click();
  // The feed card has the same headline, so wait for the story page itself.
  await expect(page).toHaveURL(/\/article\//);
  await expect(page.getByRole("heading", { level: 1, name: read })).toBeVisible();
  expect(await readBelowNext()).toBe(true);

  await open(page, "/settings");
  await page.getByRole("switch", { name: "Learn from what you read" }).click();
  expect(await readBelowNext()).toBe(false);

  await open(page, "/settings");
  await page.getByRole("switch", { name: "Learn from what you read" }).click();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByText("Reading history cleared")).toBeVisible();
  expect(await readBelowNext()).toBe(false);
});
