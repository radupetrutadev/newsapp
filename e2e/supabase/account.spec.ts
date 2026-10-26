import { open, reply } from "../support/page";
import { addReply, admin, canSignIn, createReader, expect, story, test } from "../support/supabase";

const slug = "daily-walks-lower-heart-disease-risk";

test("deleting an account removes it and keeps the threads others answered", async ({ signedIn, visitor }) => {
  const { id: articleId } = await story(slug);
  const carol = await signedIn("Carol Leaving");
  const dan = await createReader("Dan Staying");
  const tag = Date.now();
  const answered = await addReply(carol, articleId, `Carol was answered ${tag}`);
  await addReply(dan, articleId, `Dan answers Carol ${tag}`, answered);
  const alone = await addReply(carol, articleId, `Carol alone ${tag}`);

  await open(carol.page, "/settings");
  await carol.page.getByRole("button", { name: "Delete account" }).click();
  const dialog = carol.page.getByRole("dialog", { name: "Delete your account?" });
  const confirm = dialog.getByRole("button", { name: "Delete account" });
  await expect(confirm).toBeDisabled();
  // The username, typed with or without @ and in any case.
  await dialog.getByLabel(`Type ${carol.handle} to confirm`).fill(`@${carol.handle.toUpperCase()}`);
  await confirm.click();

  await expect(carol.page).toHaveURL("/login?message=deleted");
  await expect(carol.page.getByText("Your account and everything in it were deleted.")).toBeVisible();

  expect((await admin.auth.admin.getUserById(carol.id)).data.user).toBeNull();
  expect((await admin.from("profiles").select("id").eq("id", carol.id)).data).toEqual([]);
  expect(await canSignIn(carol.email, carol.password)).toBe(false);
  const { data: placeholder } = await admin.from("comments").select("user_id, deleted_at").eq("id", answered).single();
  expect(placeholder?.user_id).toBeNull();
  expect(placeholder?.deleted_at).not.toBeNull();
  expect((await admin.from("comments").select("id").eq("id", alone)).data).toEqual([]);

  const page = await visitor();
  await open(page, `/article/${slug}`);
  await expect(reply(page, answered).getByText("This reply was deleted.")).toBeVisible();
  await expect(page.getByText(`Dan answers Carol ${tag}`)).toBeVisible();
});
