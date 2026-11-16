import { expectToast, open, openReplyMenu, postReply, reload, reply } from "../support/page";
import { addReply, admin, createReader, expect, story, test } from "../support/supabase";

const slug = "lunar-lander-confirms-water-ice";

test("reported replies fold for the reporter and hide for everyone after three reports", async ({
  signedIn,
  visitor,
}) => {
  const { id: articleId } = await story(slug);
  const author = await createReader("Spammy Author");
  const text = `Buy followers now ${Date.now()}`;
  const spam = await addReply(author, articleId, text);
  // Answered, so it stays in the thread as a placeholder once hidden.
  await addReply(await createReader("Someone Answering"), articleId, `Please stop ${Date.now()}`, spam);
  const carol = await signedIn("Carol Reports");

  await open(carol.page, `/article/${slug}`);
  await openReplyMenu(carol.page, spam);
  await carol.page.getByRole("menuitem", { name: "Report reply" }).click();
  const dialog = carol.page.getByRole("dialog", { name: "Report this reply" });
  await expect(dialog.getByRole("button", { name: "Report" })).toBeDisabled();
  await dialog.getByText("Spam", { exact: true }).click();
  await dialog.getByRole("button", { name: "Report" }).click();
  await expectToast(carol.page, "Thanks for letting us know");
  await expect(reply(carol.page, spam).getByText("You reported this reply.")).toBeVisible();

  const { data: report } = await admin.from("comment_reports").select("reason").eq("comment_id", spam).single();
  expect(report?.reason).toBe("spam");

  await reload(carol.page);
  await expect(reply(carol.page, spam).getByText("You reported this reply.")).toBeVisible();
  await reply(carol.page, spam).getByRole("button", { name: "Show" }).click();
  await expect(reply(carol.page, spam)).toContainText(text);

  // Two more readers report it.
  for (const name of ["Second Reporter", "Third Reporter"]) {
    const reporter = await createReader(name);
    const { error } = await admin.from("comment_reports").insert({ comment_id: spam, reporter_id: reporter.id, reason: "spam" });
    expect(error).toBeNull();
  }
  const { data: hidden } = await admin.from("comments").select("hidden_at").eq("id", spam).single();
  expect(hidden?.hidden_at).not.toBeNull();

  const page = await visitor();
  await open(page, `/article/${slug}`);
  await expect(reply(page, spam)).toContainText("hidden after readers reported it");
  // The text never reaches the browser.
  expect(await page.content()).not.toContain(text);
});

test("signed-out visitors are asked to sign in to report", async ({ visitor }) => {
  const { id: articleId } = await story(slug);
  const author = await createReader("Some Author");
  const id = await addReply(author, articleId, `A perfectly fine reply ${Date.now()}`);

  const page = await visitor();
  await open(page, `/article/${slug}`);
  await openReplyMenu(page, id);
  await page.getByRole("menuitem", { name: "Report reply" }).click();
  await expectToast(page, "Sign in to report replies");
});

test("the database's spam limits reach the reader as they are written", async ({ signedIn }) => {
  const dan = await signedIn("Dan Fastfingers");
  await open(dan.page, `/article/${slug}`);
  const tag = Date.now();

  await postReply(dan.page, `Same thing twice ${tag}`);
  await expectToast(dan.page, "Your reply was sent");
  await postReply(dan.page, `same thing twice ${tag} `);
  await expectToast(dan.page, "You already posted that reply.");

  await postReply(dan.page, "links https://a.example https://b.example https://c.example");
  await expectToast(dan.page, "Replies can include up to two links.");

  // Five a minute: four more go through, the sixth doesn't.
  for (let i = 1; i <= 4; i++) {
    await postReply(dan.page, `Quick reply ${i} ${tag}`);
    // Sent once it shows and the box is empty again.
    await expect(dan.page.getByText(`Quick reply ${i} ${tag}`)).toBeVisible();
    await expect(dan.page.getByRole("textbox", { name: "Post your reply" })).toHaveValue("");
  }
  await postReply(dan.page, `One too many ${tag}`);
  await expectToast(dan.page, "You're replying too fast. Wait a minute and try again.");
  expect((await admin.from("comments").select("id").eq("body", `One too many ${tag}`)).data).toEqual([]);
});
