import { expect, test } from "../support/test";
import { open, reload, storyCard } from "../support/page";

const methane = "Climate summit reaches last-minute deal to cut methane emissions 40% by 2035";

test("the feed lists stories and opens one", async ({ page }) => {
  await open(page, "/");
  await expect(page.locator("article").first()).toBeVisible();

  await storyCard(page, methane).getByRole("link", { name: methane, exact: true }).click();
  await expect(page).toHaveURL("/article/climate-summit-methane-deal");
  await expect(page.getByRole("heading", { name: methane })).toBeVisible();
});

test("likes and bookmarks stay in this browser", async ({ page }) => {
  await open(page, "/");
  const card = storyCard(page, methane);
  await card.getByRole("button", { name: "Like", exact: true }).click();
  await card.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect(card.getByRole("button", { name: "Unlike" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Remove bookmark" })).toBeVisible();

  await reload(page);
  await expect(storyCard(page, methane).getByRole("button", { name: "Unlike" })).toBeVisible();

  await open(page, "/bookmarks");
  await expect(storyCard(page, methane)).toBeVisible();
});

test("search finds stories by their words", async ({ page }) => {
  await open(page, "/search?q=methane");
  await expect(storyCard(page, methane)).toBeVisible();
});
