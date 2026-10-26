import { open } from "../support/page";
import { canSignIn, createReader, emailLink, expect, test } from "../support/supabase";

test("a reader resets a forgotten password from the emailed link", async ({ page }) => {
  const reader = await createReader("Forgetful Reader");

  await open(page, "/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page).toHaveURL("/forgot-password");
  await page.getByRole("textbox", { name: "Email" }).fill(reader.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(`If an account uses ${reader.email}`)).toBeVisible();

  // The link goes through Supabase Auth, then /auth/callback, in the same browser.
  let link: string | null = null;
  await expect.poll(async () => (link = await emailLink(reader.email, "/auth/v1/verify"))).not.toBeNull();
  await page.goto(link!);
  await expect(page).toHaveURL("/reset-password");

  await page.getByLabel("New password", { exact: true }).fill("a-brand-new-password");
  await page.getByLabel("Confirm new password").fill("a-brand-new-password");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Your password was changed.")).toBeVisible();

  expect(await canSignIn(reader.email, "a-brand-new-password")).toBe(true);
  expect(await canSignIn(reader.email, reader.password)).toBe(false);
});

test("the reset answer is the same for addresses without an account", async ({ page }) => {
  await open(page, "/forgot-password");
  await page.getByRole("textbox", { name: "Email" }).fill("nobody-here@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If an account uses nobody-here@example.com")).toBeVisible();
});

test("a broken or used reset link explains what to do", async ({ page }) => {
  await open(page, "/auth/callback?next=/reset-password&code=not-a-real-code");
  await expect(page).toHaveURL("/forgot-password?error=link");
  await expect(page.getByText("That reset link has expired or was already used")).toBeVisible();

  await open(page, "/reset-password");
  await expect(page.getByText("Your reset link has expired or was already used.")).toBeVisible();
});

test("a signed-in reader changes their password from Settings", async ({ signedIn }) => {
  const { page, email, password } = await signedIn("Careful Reader");

  await open(page, "/settings");
  await page.getByRole("link", { name: "Change", exact: true }).click();
  await expect(page).toHaveURL("/reset-password");

  const fill = async (next: string, confirm: string) => {
    await page.getByLabel("New password", { exact: true }).fill(next);
    await page.getByLabel("Confirm new password").fill(confirm);
    await page.getByRole("button", { name: "Change password" }).click();
  };
  await fill("a-new-password-1", "a-new-password-2");
  await expect(page.getByText("The two passwords don't match.")).toBeVisible();
  await fill(password, password);
  await expect(page.getByText("That's your current password.")).toBeVisible();
  await fill("a-new-password-1", "a-new-password-1");
  await expect(page.getByText("Your password was changed.")).toBeVisible();

  expect(await canSignIn(email, "a-new-password-1")).toBe(true);
});
