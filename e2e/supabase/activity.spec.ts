import { open, setSwitch, storyCard } from "../support/page";
import { admin, expect, signIn, test } from "../support/supabase";
import { keepOffline } from "../support/test";

const privacy = { slug: "bipartisan-digital-privacy-bill" };
const wildfire = "Wildfire crews contain hillside blaze after a night of evacuations";

test("likes, bookmarks and follows are saved to the account", async ({ signedIn, browser, baseURL }) => {
  const reader = await signedIn("Saving Reader");
  const page = reader.page;

  // The story's own buttons come first; related stories follow.
  await open(page, `/article/${privacy.slug}`);
  await page.getByRole("button", { name: "Like", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Unlike" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Bookmark", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Remove bookmark" }).first()).toBeVisible();
  // Saved in the background; leaving the page too soon would cancel it.
  const saved = (table: "likes" | "bookmarks" | "follows") => async () =>
    (await admin.from(table).select("user_id").eq("user_id", reader.id)).data?.length;
  await expect.poll(saved("likes")).toBe(1);
  await expect.poll(saved("bookmarks")).toBe(1);

  await open(page, "/source/pulsedispatch");
  await page.getByRole("main").getByRole("button", { name: "Follow", exact: true }).first().click();
  await expect(page.getByRole("main").getByRole("button", { name: /^(Following|Unfollow)$/ }).first()).toBeVisible();
  await expect.poll(saved("follows")).toBe(1);

  // The same reader on another device.
  const other = await browser.newContext();
  await keepOffline(other);
  await signIn(other, reader, baseURL!);
  const phone = await other.newPage();
  await open(phone, `/article/${privacy.slug}`);
  await expect(phone.getByRole("button", { name: "Unlike" }).first()).toBeVisible();
  await open(phone, "/bookmarks");
  const { data: bookmarked } = await admin.from("articles").select("title").eq("slug", privacy.slug).single();
  await expect(storyCard(phone, bookmarked!.title)).toBeVisible();
  await other.close();
});

test("settings are saved to the account and apply everywhere", async ({ signedIn, browser, baseURL }) => {
  const reader = await signedIn("Settings Reader");

  await open(reader.page, "/source/pulsedispatch");
  await expect(storyCard(reader.page, wildfire).getByText("Sensitive content")).toBeVisible();

  await open(reader.page, "/settings");
  await setSwitch(
    reader.page,
    "Hide sensitive content",
    false,
    async () =>
      (await admin.from("user_settings").select("hide_sensitive").eq("user_id", reader.id).maybeSingle()).data
        ?.hide_sensitive,
  );

  const other = await browser.newContext();
  await keepOffline(other);
  await signIn(other, reader, baseURL!);
  const page = await other.newPage();
  await open(page, "/source/pulsedispatch");
  await expect(storyCard(page, wildfire)).toBeVisible();
  await expect(storyCard(page, wildfire).getByText("Sensitive content")).toHaveCount(0);
  await other.close();
});
