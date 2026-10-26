import type { Locator } from "@playwright/test";
import { expect, test } from "../support/test";
import { open, serveDemoVideoAsWebm, storyCard } from "../support/page";

const aurora = "Strongest solar storm in two decades paints auroras across southern skies";
const wildfire = "Wildfire crews contain hillside blaze after a night of evacuations";

const isPlayingMuted = (video: Locator) =>
  video.evaluate((element: HTMLVideoElement) => !element.paused && element.muted && element.currentTime > 0);

test.beforeEach(async ({ page }) => {
  await serveDemoVideoAsWebm(page);
});

test("sensitive photos stay blurred until the reader shows them", async ({ page }) => {
  await open(page, "/source/pulsedispatch");
  const card = storyCard(page, wildfire);
  await expect(card.getByText("Sensitive content")).toBeVisible();

  await card.getByRole("button", { name: "Show" }).click();
  await expect(card.getByText("Sensitive content")).toBeHidden();
  // Show sits on top of the card's link but doesn't follow it.
  await expect(page).toHaveURL("/source/pulsedispatch");
});

test("with autoplay off, video stories show a play badge instead", async ({ page }) => {
  await open(page, "/source/orbitweekly");
  const card = storyCard(page, aurora);
  await expect(card.locator(".lucide-play")).toBeVisible();
  await expect(card.locator("video")).toHaveCount(0);
});

test("with autoplay on, previews play muted on screen and pause off screen", async ({ page }) => {
  await open(page, "/settings");
  await page.getByRole("switch", { name: "Autoplay video" }).click();
  await expect(page.getByRole("switch", { name: "Autoplay video" })).toBeChecked();

  await open(page, "/source/orbitweekly");
  const video = storyCard(page, aurora).locator("video");
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => isPlayingMuted(video)).toBe(true);

  // Push it off screen, however short the page is.
  await page.evaluate(() => {
    document.body.style.paddingBottom = "200vh";
    window.scrollTo(0, document.body.scrollHeight);
  });
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);

  // The preview lets clicks through to the story.
  await video.scrollIntoViewIfNeeded();
  await video.click({ force: true });
  await expect(page).toHaveURL("/article/solar-storm-auroras-southern-skies");
});

test("the story page has a video player", async ({ page }) => {
  await open(page, "/article/solar-storm-auroras-southern-skies");
  const player = page.locator("article video[controls]");
  await expect(player).toBeVisible();
  await expect
    .poll(() => player.evaluate((element: HTMLVideoElement) => element.readyState >= 1 && !element.error))
    .toBe(true);
});
