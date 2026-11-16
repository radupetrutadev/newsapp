import type { APIRequestContext } from "@playwright/test";
import { open, setSwitch, storyCard } from "../support/page";
import { admin, cronSecret, expect, test } from "../support/supabase";

// Embeddings come from the stand-in API in e2e/support/fake-openai.mjs.

async function embedStories(request: APIRequestContext) {
  const run = await request.post("/api/ingest", { headers: { authorization: `Bearer ${cronSecret}` } });
  expect(run.status()).toBe(200);
}

interface FeedStory {
  slug: string;
  coverage: unknown;
}

/** Every story in "For you", in order, as whoever `request` is signed in as sees it. */
async function forYou(request: APIRequestContext): Promise<FeedStory[]> {
  const stories: FeedStory[] = [];
  let cursor: string | null = null;
  do {
    const query: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const page = await (await request.get(`/api/feed?feed=for-you${query}`)).json();
    stories.push(...page.articles);
    cursor = page.next;
  } while (cursor);
  return stories;
}

const position = (stories: FeedStory[], slug: string) => stories.findIndex((story) => story.slug === slug);

test("ingestion gives stories an embedding", async ({ request }) => {
  await embedStories(request);
  const { data } = await admin.from("articles").select("embedding").eq("slug", "ev-sales-top-quarter-of-new-cars").single();
  expect(data?.embedding).toBeTruthy();
});

test("search finds stories by meaning as well as by their words", async ({ page, request }) => {
  await embedStories(request);

  // No story uses the word, but one is about cars.
  await open(page, "/search?q=automobiles");
  await expect(storyCard(page, "Electric vehicles now make up a quarter of new cars sold worldwide")).toBeVisible();

  // Stories that use the words still come first.
  await open(page, "/search?q=methane");
  await expect(page.getByRole("main").locator("article").first()).toContainText(/methane/i);
});

test("For you learns from the stories a reader opens, until they turn it off or clear it", async ({
  signedIn,
  request,
}) => {
  const reader = await signedIn("History Reader");
  const everyone = await forYou(request);
  // A story near the top that isn't part of a cluster, so it can't be swapped for
  // another publisher's take, and the one after it.
  const index = everyone.findIndex((story, at) => at >= 2 && !story.coverage);
  const [read, next] = [everyone[index].slug, everyone[index + 1].slug];

  const historyRows = async () =>
    (await admin.from("reading_history").select("article_id").eq("user_id", reader.id)).data?.length;
  const readBelowNext = async () => {
    const mine = await forYou(reader.page.request);
    return position(mine, read) > position(mine, next);
  };

  await open(reader.page, `/article/${read}`);
  await expect.poll(historyRows).toBe(1);
  expect(await readBelowNext()).toBe(true);

  const personalized = async () =>
    (await admin.from("user_settings").select("personalize_feed").eq("user_id", reader.id).maybeSingle()).data
      ?.personalize_feed;
  await open(reader.page, "/settings");
  await setSwitch(reader.page, "Learn from what you read", false, personalized);
  expect(await readBelowNext()).toBe(false);

  await setSwitch(reader.page, "Learn from what you read", true, personalized);
  expect(await readBelowNext()).toBe(true);

  await reader.page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(reader.page.getByText("Reading history cleared")).toBeVisible();
  expect(await historyRows()).toBe(0);
  expect(await readBelowNext()).toBe(false);
});
