import { expect, test } from "../support/test";
import { open } from "../support/page";

// The top bar on desktop and the dock on phones are both the "Primary" navigation.
test("the primary navigation marks the current section", async ({ page }) => {
  await open(page, "/explore");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Explore" })).toHaveAttribute("aria-current", "page");

  await nav.getByRole("link", { name: "Bookmarks" }).click();
  await expect(page).toHaveURL("/bookmarks");
  await expect(nav.getByRole("link", { name: "Bookmarks" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Explore" })).not.toHaveAttribute("aria-current");
});

test("the top bar searches from any page", async ({ page, isMobile }) => {
  test.skip(isMobile, "Phones search from Explore, which has its own box.");
  await open(page, "/topics");
  const search = page.getByRole("searchbox", { name: "Search Pulse" });
  await search.fill("methane");
  await search.press("Enter");

  await expect(page).toHaveURL("/search?q=methane");
  await expect(page.getByRole("main").locator("article").first()).toContainText(/methane/i);
  // The search page has its own box, so the top bar's steps aside.
  await expect(page.getByRole("searchbox", { name: "Search Pulse" })).toHaveCount(1);
});
