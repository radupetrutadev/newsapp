import type { Page } from "@playwright/test";
import { open } from "../support/page";
import { canSignIn, createReader, expect, test } from "../support/supabase";

/** The value under a row's title on the settings page. */
const settingsValue = (page: Page, title: string) =>
  page.getByRole("main").getByText(title, { exact: true }).locator("xpath=following-sibling::*[1]");

test("a new reader signs up, logs out and signs back in", async ({ page }) => {
  const handle = `n${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 6)}`;
  const email = `${handle}@example.com`;

  await open(page, "/signup");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("New Reader");
  await page.getByRole("textbox", { name: "Username" }).fill(handle);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill("a-long-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/");

  await open(page, "/settings");
  await expect(settingsValue(page, "Username")).toHaveText(`@${handle}`);
  await expect(settingsValue(page, "Email")).toHaveText(email);

  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL("/login");

  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill("the-wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Invalid login credentials")).toBeVisible();

  // The form clears after each attempt.
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill("a-long-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("/");
  expect(await canSignIn(email, "a-long-password")).toBe(true);
});

test("a taken username gets a suffix instead of failing the sign-up", async ({ page }) => {
  const taken = await createReader("Taken Name");
  await open(page, "/signup");
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Copycat");
  await page.getByRole("textbox", { name: "Username" }).fill(taken.handle);
  await page.getByRole("textbox", { name: "Email" }).fill(`copy-${taken.email}`);
  await page.getByLabel("Password").fill("a-long-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL("/");

  await open(page, "/settings");
  await expect(settingsValue(page, "Username")).toHaveText(new RegExp(`^@${taken.handle.slice(0, 10)}_[0-9a-f]{4}$`));
});
