import { clickUntil, expectToast, open, openReplyMenu, postReply, reload, reply } from "../support/page";
import { addReply, admin, createReader, expect, replyId, story, test } from "../support/supabase";

const slug = "markets-rally-inflation-cools";

test("replies form threads, oldest first, and say whom they answer", async ({ signedIn }) => {
  const { id: articleId } = await story(slug);
  const alice = await signedIn("Alice Thread");
  const bob = await signedIn("Bob Thread");
  const carol = await signedIn("Carol Thread");
  const tag = Date.now();

  await open(alice.page, `/article/${slug}`);
  await postReply(alice.page, `Alice starts a thread ${tag}`);
  await expectToast(alice.page, "Your reply was sent");
  const root = await replyId(alice, `Alice starts a thread ${tag}`);

  await open(bob.page, `/article/${slug}`);
  await reply(bob.page, root).getByRole("button", { name: "Reply to Alice Thread" }).click();
  await postReply(bob.page, `Bob answers Alice ${tag}`);
  await expectToast(bob.page, "Your reply was sent");
  const bobReply = await replyId(bob, `Bob answers Alice ${tag}`);

  await open(carol.page, `/article/${slug}`);
  await reply(carol.page, bobReply).getByRole("button", { name: "Reply to Bob Thread" }).click();
  await postReply(carol.page, `Carol answers Bob ${tag}`);
  await expectToast(carol.page, "Your reply was sent");
  const carolReply = await replyId(carol, `Carol answers Bob ${tag}`);

  // The database files every reply under the thread's first comment.
  const { data: rows } = await admin.from("comments").select("id, root_id").in("id", [bobReply, carolReply]);
  expect(rows?.map((row) => row.root_id)).toEqual([root, root]);
  const { data: counted } = await admin.from("articles").select("comments_count").eq("id", articleId).single();
  expect(counted?.comments_count).toBeGreaterThanOrEqual(3);

  await reload(alice.page);
  const thread = await reply(alice.page, root).locator("xpath=..").innerText();
  const order = [`Alice starts`, `Bob answers`, `Carol answers`].map((text) => thread.indexOf(`${text}`));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await expect(reply(alice.page, carolReply)).toContainText(`Replying to @${bob.handle}`);
  await expect(reply(alice.page, bobReply)).not.toContainText("Replying to");
});

test("long threads fold, and a link to a folded reply opens it", async ({ signedIn }) => {
  const { id: articleId } = await story(slug);
  const alice = await signedIn("Alice Fold");
  const root = await addReply(alice, articleId, `A thread with many answers ${Date.now()}`);
  const answers: string[] = [];
  for (let i = 1; i <= 4; i++) answers.push(await addReply(alice, articleId, `Answer number ${i} ${root}`, root));

  await open(alice.page, `/article/${slug}`);
  await expect(reply(alice.page, answers[1])).toBeVisible();
  await expect(reply(alice.page, answers[3])).toHaveCount(0);
  await reply(alice.page, root).locator("xpath=..").getByRole("button", { name: "Show 2 more replies" }).click();
  await expect(reply(alice.page, answers[3])).toBeVisible();

  await open(alice.page, `/article/${slug}#comment-${answers[3]}`);
  await expect(alice.page.locator(`#comment-${answers[3]}[data-linked]`)).toBeVisible();
});

test("likes on replies are saved", async ({ signedIn }) => {
  const { id: articleId } = await story(slug);
  const alice = await signedIn("Alice Likes");
  const bob = await signedIn("Bob Liked");
  const bobReply = await addReply(bob, articleId, `Worth a like ${Date.now()}`);

  await open(alice.page, `/article/${slug}`);
  await clickUntil(
    reply(alice.page, bobReply).getByRole("button", { name: "Like", exact: true }),
    reply(alice.page, bobReply).getByRole("button", { name: "Unlike" }),
  );
  await expect
    .poll(async () => (await admin.from("comment_likes").select("user_id").eq("comment_id", bobReply)).data?.length)
    .toBe(1);

  await reload(alice.page);
  await expect(reply(alice.page, bobReply).getByRole("button", { name: "Unlike" })).toHaveText("1");
});

test("deleting an answered reply leaves a placeholder; an unanswered one disappears", async ({ signedIn }) => {
  const { id: articleId } = await story(slug);
  const alice = await signedIn("Alice Deletes");
  const bob = await signedIn("Bob Stays");
  const tag = Date.now();
  const answered = await addReply(alice, articleId, `Alice was answered ${tag}`);
  await addReply(bob, articleId, `Bob's answer stays ${tag}`, answered);
  const alone = await addReply(alice, articleId, `Alice was not answered ${tag}`);

  await open(alice.page, `/article/${slug}`);
  await openReplyMenu(alice.page, answered);
  await expect(alice.page.getByRole("menuitem", { name: "Report reply" })).toHaveCount(0);
  await alice.page.getByRole("menuitem", { name: "Delete" }).click();
  await alice.page.getByRole("dialog", { name: "Delete reply?" }).getByRole("button", { name: "Delete" }).click();
  await expectToast(alice.page, "Your reply was deleted");
  await expect(reply(alice.page, answered).getByText("This reply was deleted.")).toBeVisible();

  const { data: placeholder } = await admin.from("comments").select("body, user_id, deleted_at").eq("id", answered).single();
  expect(placeholder).toMatchObject({ body: "", user_id: null });
  expect(placeholder?.deleted_at).not.toBeNull();

  await openReplyMenu(alice.page, alone);
  await alice.page.getByRole("menuitem", { name: "Delete" }).click();
  await alice.page.getByRole("dialog", { name: "Delete reply?" }).getByRole("button", { name: "Delete" }).click();
  await expect(reply(alice.page, alone)).toHaveCount(0);
  expect((await admin.from("comments").select("id").eq("id", alone)).data).toEqual([]);

  await reload(alice.page);
  await expect(reply(alice.page, answered).getByText("This reply was deleted.")).toBeVisible();
  await expect(alice.page.getByText(`Bob's answer stays ${tag}`)).toBeVisible();
});

test("signed-out visitors are asked to sign in to reply", async ({ visitor }) => {
  const { id: articleId } = await story(slug);
  const author = await createReader("Open Author");
  const id = await addReply(author, articleId, `Anyone can read this ${Date.now()}`);

  const page = await visitor();
  await open(page, `/article/${slug}`);
  await expect(page.getByText("Sign in to join the conversation.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Post your reply" })).toHaveCount(0);
  await reply(page, id).getByRole("button", { name: "Reply to Open Author" }).click();
  await expectToast(page, "Sign in to reply");
});
