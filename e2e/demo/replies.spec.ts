import { expect, test } from "../support/test";
import { expectToast, open, openReplyMenu, postReply, reply } from "../support/page";

// Mock replies on the methane story: c-001 starts a thread that c-019, c-020
// (answering c-019) and c-021 continue.
const story = "/article/climate-summit-methane-deal";

test("replies are grouped into threads, oldest reply first", async ({ page }) => {
  await open(page, story);
  const thread = await reply(page, "c-001").locator("xpath=..").innerText();
  const order = [
    "weekly satellite leak data",
    "Who enforces?",
    "The repair fund",
    "Annual inventories",
  ].map((text) => thread.indexOf(text));
  expect(order.every((index) => index >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));

  await expect(reply(page, "c-020")).toContainText("Replying to @jonahwrites");
  await expect(reply(page, "c-019")).not.toContainText("Replying to");
});

test("a reader can answer a reply, then delete it", async ({ page }) => {
  await open(page, story);
  await reply(page, "c-021").getByRole("button", { name: "Reply to Lena Kowalski" }).click();
  await postReply(page, "Demo reader joins the thread");
  await expectToast(page, "Your reply was sent");

  const mine = page.locator("article", { hasText: "Demo reader joins the thread" });
  await expect(reply(page, "c-001").locator("xpath=..")).toContainText("Demo reader joins the thread");

  await mine.getByRole("button", { name: "More options for this reply" }).click();
  await expect(page.getByRole("menuitem", { name: "Report reply" })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("dialog", { name: "Delete reply?" }).getByRole("button", { name: "Delete" }).click();
  await expectToast(page, "Your reply was deleted");
  await expect(mine).toHaveCount(0);
});

test("reporting a reply folds it away", async ({ page }) => {
  await open(page, story);
  await openReplyMenu(page, "c-002");
  await page.getByRole("menuitem", { name: "Report reply" }).click();

  const dialog = page.getByRole("dialog", { name: "Report this reply" });
  await expect(dialog.getByRole("button", { name: "Report" })).toBeDisabled();
  await dialog.getByText("Harassment or hate").click();
  await dialog.getByRole("button", { name: "Report" }).click();

  await expect(reply(page, "c-002").getByText("You reported this reply.")).toBeVisible();
  await reply(page, "c-002").getByRole("button", { name: "Show" }).click();
  await expect(reply(page, "c-002")).toContainText("Binding on paper");
});
