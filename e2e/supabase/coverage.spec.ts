import { open } from "../support/page";
import { admin, cronSecret, expect, test } from "../support/supabase";

test("For you never shows two stories about the same event", async ({ request }) => {
  const clusters: string[] = [];
  let cursor: string | null = null;
  do {
    const query: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : "";
    const page = await (await request.get(`/api/feed?feed=for-you${query}`)).json();
    for (const article of page.articles) if (article.coverage) clusters.push(article.coverage.clusterId);
    cursor = page.next;
  } while (cursor);

  // The seed has four events covered by several publishers.
  expect(clusters.length).toBeGreaterThanOrEqual(4);
  expect(new Set(clusters).size).toBe(clusters.length);
});

test("seeded stories about the same event show as full coverage", async ({ page }) => {
  await open(page, "/article/climate-summit-methane-deal");
  const coverage = page.getByRole("region", { name: "Full coverage" });
  await expect(coverage.getByText("4 sources · first reported")).toBeVisible();
  await expect(coverage.getByRole("listitem")).toHaveCount(4);
});

test("ingestion puts new stories about the same event in one cluster", async ({ request, page }) => {
  const { data: sources } = await admin.from("sources").select("id, handle").in("handle", ["meridian", "circuit"]);
  const tag = Date.now().toString(36);
  const stories = [
    {
      source: sources![0],
      title: `Volcano ${tag} erupts on Kestrel Island, forcing 3,000 to evacuate`,
      summary: `Lava from the Kestrel Island volcano ${tag} reached the coast road as officials ordered 3,000 residents to leave.`,
    },
    {
      source: sources![1],
      title: `Kestrel Island eruption: 3,000 evacuated as volcano ${tag} sends lava to the coast`,
      summary: `Residents of Kestrel Island were evacuated after volcano ${tag} erupted overnight.`,
    },
  ];
  const { data: inserted, error } = await admin
    .from("articles")
    .insert(
      stories.map((story, index) => ({
        slug: `kestrel-${tag}-${index}`,
        source_id: story.source.id,
        title: story.title,
        summary: story.summary,
        category: "world",
        url: `https://${story.source.handle}.example.com/kestrel-${tag}`,
        published_at: new Date(Date.now() - (2 - index) * 60_000).toISOString(),
      })),
    )
    .select("id, slug");
  expect(error).toBeNull();

  const run = await request.post("/api/ingest", { headers: { authorization: `Bearer ${cronSecret}` } });
  expect(run.status()).toBe(200);

  const { data: rows } = await admin.from("articles").select("cluster_id").in("id", inserted!.map((row) => row.id));
  expect(rows?.[0].cluster_id).toBeTruthy();
  expect(rows?.[1].cluster_id).toBe(rows?.[0].cluster_id);

  // Earlier runs of this test reported the same eruption, so the cluster can
  // hold more, and its list may be cached: ingestion refreshes cached pages in
  // the background, so a later visit has the new stories.
  const coverage = page.getByRole("region", { name: "Full coverage" });
  await expect(async () => {
    await open(page, `/article/${inserted![1].slug}`);
    await expect(coverage.getByRole("link", { name: stories[0].title })).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(coverage.getByRole("listitem").filter({ hasText: stories[1].title })).toContainText("You're reading this");
});
