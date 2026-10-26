import { cronSecret, expect, test } from "../support/supabase";

test("ingestion only runs for the scheduler", async ({ request }) => {
  expect((await request.post("/api/ingest")).status()).toBe(401);
  expect((await request.post("/api/ingest", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);

  // The local database has no feeds, so a run finds nothing, but it runs.
  const run = await request.post("/api/ingest", { headers: { authorization: `Bearer ${cronSecret}` } });
  expect(run.status()).toBe(200);
  expect(await run.json()).toMatchObject({ added: 0 });
});

test("the feed API pages through stories", async ({ request }) => {
  const first = await (await request.get("/api/feed?feed=for-you")).json();
  expect(first.articles.length).toBe(20);
  expect(first.next).toEqual(expect.any(String));

  const second = await (await request.get(`/api/feed?feed=for-you&cursor=${encodeURIComponent(first.next)}`)).json();
  expect(second.articles.length).toBeGreaterThan(0);
  const seen = new Set(first.articles.map((article: { id: string }) => article.id));
  expect(second.articles.some((article: { id: string }) => seen.has(article.id))).toBe(false);

  expect((await request.get("/api/feed?feed=nope")).status()).toBe(400);
});
