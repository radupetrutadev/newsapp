import { expect, test } from "../support/test";
import { open, storyCard } from "../support/page";

// The mock feed has four publishers' stories about the methane deal, oldest first.
const methane = [
  "Lawmakers under pressure to write methane rules after the summit deal",
  "What the climate summit's methane deal means for gas producers",
  "Methane pledge: 140 countries commit to a 40% cut by 2035",
  "Climate summit reaches last-minute deal to cut methane emissions 40% by 2035",
];

test("For you shows each event once, linking to its full coverage", async ({ page }) => {
  await open(page, "/");
  const lead = storyCard(page, methane[3]);
  await expect(lead.getByRole("link", { name: "Full coverage · 4 sources" })).toBeVisible();
  for (const title of methane.slice(0, 3)) {
    await expect(page.getByRole("link", { name: title, exact: true })).toHaveCount(0);
  }

  await lead.getByRole("link", { name: "Full coverage · 4 sources" }).click();
  await expect(page).toHaveURL("/article/climate-summit-methane-deal#coverage");
  await expect(page.getByRole("heading", { name: "Full coverage" })).toBeVisible();
});

test("the story page lists every publisher's story about the event, oldest first", async ({ page }) => {
  await open(page, "/article/climate-summit-methane-deal");
  const coverage = page.getByRole("region", { name: "Full coverage" });
  await expect(coverage.getByText("4 sources · first reported")).toBeVisible();
  await expect(coverage.getByRole("listitem")).toHaveText(methane.map((title) => new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
  await expect(coverage.getByRole("listitem").last()).toContainText("You're reading this");

  // "More stories" skips the ones Full coverage lists.
  const more = page.getByRole("region", { name: "More stories" });
  for (const title of methane) await expect(more.getByRole("link", { name: title, exact: true })).toHaveCount(0);

  await coverage.getByRole("link", { name: methane[2] }).click();
  await expect(page).toHaveURL("/article/methane-pledge-140-countries-40-percent");
  await expect(page.getByRole("region", { name: "Full coverage" }).getByRole("listitem").nth(2)).toContainText(
    "You're reading this",
  );
});

test("a publisher's own page still lists its story, with the link to full coverage", async ({ page }) => {
  await open(page, "/source/greenline");
  await expect(storyCard(page, methane[2]).getByRole("link", { name: "Full coverage · 4 sources" })).toBeVisible();
});
