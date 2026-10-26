import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { expectToast, fixture, open } from "../support/page";
import { admin, clientFor, createReader, expect, test } from "../support/supabase";

/** Width and height of an image, decoded by the browser. */
const imageSize = (page: Page, src: string) =>
  page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, src);

const photos = async (readerId: string) => (await admin.storage.from("avatars").list(readerId)).data ?? [];

async function choosePhoto(page: Page) {
  await page.locator("input[type=file]").setInputFiles(fixture("photo.png"));
  await expect(page.locator("form img[src^='blob:']")).toBeVisible();
}

test("a reader edits their name, bio and photo, and everyone sees them", async ({ signedIn, visitor }) => {
  const alice = await signedIn("Alice Before");

  await open(alice.page, "/profile");
  await alice.page.getByRole("link", { name: "Edit profile" }).click();
  await expect(alice.page).toHaveURL("/profile/edit");
  await alice.page.getByLabel("Name").fill("Alice After");
  await alice.page.getByLabel("Bio").fill("Reads the climate desk first.\nThen everything else.");
  await choosePhoto(alice.page);
  await alice.page.getByRole("button", { name: "Save" }).click();
  await expect(alice.page).toHaveURL("/profile");
  await expect(alice.page.getByRole("heading", { name: "Alice After", level: 2 })).toBeVisible();

  const { data: profile } = await admin.from("profiles").select("display_name, bio, avatar_url").eq("id", alice.id).single();
  expect(profile).toMatchObject({ display_name: "Alice After", bio: "Reads the climate desk first.\nThen everything else." });
  expect(profile?.avatar_url).toMatch(new RegExp(`^https://.+/storage/v1/object/public/avatars/${alice.id}/\\d+\\.(webp|jpg)$`));
  // Cropped to a square and scaled down in the browser before the upload.
  expect(await imageSize(alice.page, profile!.avatar_url!)).toEqual([400, 400]);

  const page = await visitor();
  await open(page, `/user/${alice.handle}`);
  await expect(page.getByRole("heading", { name: "Alice After", level: 2 })).toBeVisible();
  await expect(page.getByText("Reads the climate desk first.")).toBeVisible();
});

test("a new photo replaces the old one, and removing it deletes it", async ({ signedIn }) => {
  const reader = await signedIn("Photo Changer");

  for (let i = 0; i < 2; i++) {
    await open(reader.page, "/profile/edit");
    await choosePhoto(reader.page);
    await reader.page.getByRole("button", { name: "Save" }).click();
    await expect(reader.page).toHaveURL("/profile");
  }
  const files = await photos(reader.id);
  expect(files).toHaveLength(1);
  const { data: profile } = await admin.from("profiles").select("avatar_url").eq("id", reader.id).single();
  expect(profile?.avatar_url).toContain(files[0].name);

  await open(reader.page, "/profile/edit");
  await reader.page.getByRole("button", { name: "Remove photo" }).click();
  await reader.page.getByRole("button", { name: "Save" }).click();
  await expect(reader.page).toHaveURL("/profile");
  expect(await photos(reader.id)).toHaveLength(0);
  const { data: removed } = await admin.from("profiles").select("avatar_url").eq("id", reader.id).single();
  expect(removed?.avatar_url).toBeNull();
});

test("files that aren't photos are refused in the browser", async ({ signedIn }) => {
  const reader = await signedIn("Careless Uploader");
  await open(reader.page, "/profile/edit");
  await reader.page.locator("input[type=file]").setInputFiles({
    name: "not-a-photo.png",
    mimeType: "image/png",
    buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
  });
  await expectToast(reader.page, "can't be opened here");
});

test("storage only takes photos in the reader's own folder", async () => {
  const alice = await createReader("Alice Storage");
  const bob = await createReader("Bob Storage");
  const client = await clientFor(alice);
  const photo = readFileSync(fixture("photo.png"));

  const own = await client.storage.from("avatars").upload(`${alice.id}/1.png`, photo, { contentType: "image/png" });
  expect(own.error).toBeNull();
  const forged = await client.storage.from("avatars").upload(`${bob.id}/1.png`, photo, { contentType: "image/png" });
  expect(forged.error?.message).toContain("row-level security");
});
