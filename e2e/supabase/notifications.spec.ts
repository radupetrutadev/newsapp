import { expectToast, open, postReply, reply } from "../support/page";
import { addReply, expect, story, test } from "../support/supabase";

const slug = "indie-sci-fi-film-streaming-record";

test("replies, likes and follows notify the reader", async ({ signedIn }) => {
  const { id: articleId } = await story(slug);
  const alice = await signedIn("Alice Notified");
  const bob = await signedIn("Bob Busy");
  const tag = Date.now();
  const aliceReply = await addReply(alice, articleId, `Alice has thoughts ${tag}`);

  await open(bob.page, `/article/${slug}`);
  await reply(bob.page, aliceReply).getByRole("button", { name: "Like", exact: true }).click();
  await expect(reply(bob.page, aliceReply).getByRole("button", { name: "Unlike" })).toBeVisible();
  await reply(bob.page, aliceReply).getByRole("button", { name: "Reply to Alice Notified" }).click();
  await postReply(bob.page, `Bob disagrees ${tag}`);
  await expectToast(bob.page, "Your reply was sent");

  await open(bob.page, `/user/${alice.handle}`);
  await bob.page.getByRole("main").getByRole("button", { name: "Follow", exact: true }).click();
  await expect(bob.page.getByRole("main").getByRole("button", { name: /^(Following|Unfollow)$/ })).toBeVisible();

  await open(alice.page, "/");
  await expect(alice.page.getByRole("link", { name: /^Notifications, \d+ unread$/ }).first()).toBeVisible();

  await open(alice.page, "/notifications");
  const list = alice.page.getByRole("main");
  await expect(list.getByText("Bob Busy replied to you")).toBeVisible();
  await expect(list.getByText(`Bob disagrees ${tag}`)).toBeVisible();
  await expect(list.getByText("Bob Busy liked your reply")).toBeVisible();
  await expect(list.getByText("Bob Busy followed you")).toBeVisible();

  await list.getByText("Bob Busy replied to you").click();
  await expect(alice.page).toHaveURL(new RegExp(`/article/${slug}#comment-`));
});
