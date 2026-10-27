import { expect, test } from "../support/test";
import { open } from "../support/page";

test("the demo profile can be edited, but explains nothing is saved", async ({ page }) => {
  await open(page, "/profile");
  await page.getByRole("link", { name: "Edit profile" }).click();
  await expect(page).toHaveURL("/profile/edit");
  await expect(page.getByText("changes aren't saved")).toBeVisible();

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("This is the demo account.")).toBeVisible();
});

test("signing in explains demo mode", async ({ page }) => {
  await open(page, "/login");
  await page.getByRole("textbox", { name: "Email" }).fill("reader@example.com");
  await page.getByLabel("Password").fill("not-a-real-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("Pulse is running in demo mode.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("reader@example.com");
});

test("demo settings have no password or delete account rows", async ({ page }) => {
  await open(page, "/settings");
  await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete account" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Change", exact: true })).toHaveCount(0);
});
