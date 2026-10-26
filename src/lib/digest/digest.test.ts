import { describe, expect, it } from "vitest";
import { mockArticles } from "@/lib/mock/articles";
import { mockSources } from "@/lib/mock/sources";
import type { Article } from "@/lib/types";
import { buildDigestEmail, escapeHtml } from "./email";
import { digestWeek, runDigest, type DigestRecipient, type DigestStore, type OutgoingEmail } from "./run";
import { isValidUnsubscribeToken, unsubscribeToken } from "./token";

const sources = new Map(mockSources.map((source) => [source.id, source]));
const stories: Article[] = mockArticles.slice(0, 3).map(({ sourceId, minutesAgo, videoUrl, isSensitive, ...article }) => ({
  ...article,
  videoUrl: videoUrl ?? null,
  isSensitive: isSensitive ?? false,
  source: sources.get(sourceId)!,
  publishedAt: new Date(Date.parse("2026-10-25T12:00:00Z") - minutesAgo * 60_000).toISOString(),
}));

const SECRET = "test-secret-test-secret-test-secret";
const options = { siteName: "Pulse", siteUrl: "https://pulse.example", secret: SECRET, now: new Date("2026-11-01T08:00:00Z") };

describe("digestWeek", () => {
  it("is the Monday of the week, in UTC", () => {
    expect(digestWeek(new Date("2026-11-01T08:00:00Z"))).toBe("2026-10-26"); // Sunday
    expect(digestWeek(new Date("2026-10-26T00:00:00Z"))).toBe("2026-10-26"); // Monday
    expect(digestWeek(new Date("2026-10-25T23:59:59Z"))).toBe("2026-10-19");
  });
});

describe("unsubscribe tokens", () => {
  it("only work for the reader and secret they were made for", () => {
    const token = unsubscribeToken("user-a", SECRET);
    expect(isValidUnsubscribeToken("user-a", token, SECRET)).toBe(true);
    expect(isValidUnsubscribeToken("user-b", token, SECRET)).toBe(false);
    expect(isValidUnsubscribeToken("user-a", token, "another-secret")).toBe(false);
    expect(isValidUnsubscribeToken("user-a", token.slice(1), SECRET)).toBe(false);
    expect(isValidUnsubscribeToken("user-a", token, "")).toBe(false);
  });
});

describe("buildDigestEmail", () => {
  it("lists the stories with links and escapes what it shows", () => {
    const email = buildDigestEmail({
      name: "Ava <script>",
      stories,
      siteName: "Pulse",
      siteUrl: "https://pulse.example",
      unsubscribeUrl: "https://pulse.example/unsubscribe?u=1&t=2",
    });
    expect(email.subject).toBe(`Pulse this week: ${stories[0].title}`);
    expect(email.html).toContain("Hi Ava &lt;script&gt;,");
    expect(email.html).not.toContain("<script>");
    for (const story of stories) {
      expect(email.html).toContain(`https://pulse.example/article/${story.slug}`);
      expect(email.text).toContain(story.title);
    }
    expect(email.html).toContain('href="https://pulse.example/unsubscribe?u=1&amp;t=2"');
    expect(email.text).toContain("Stop these emails: https://pulse.example/unsubscribe?u=1&t=2");
  });

  it("escapes HTML", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

function fakeStore(readers: DigestRecipient[], top = stories) {
  const claimed = new Map<string, string>();
  const store: DigestStore = {
    async topStories() {
      return top;
    },
    async claimRecipients(week, max) {
      const free = readers.filter((reader) => !claimed.has(`${week}:${reader.userId}`)).slice(0, max);
      for (const reader of free) claimed.set(`${week}:${reader.userId}`, reader.userId);
      return free;
    },
    async releaseRecipients(week, userIds) {
      for (const id of userIds) claimed.delete(`${week}:${id}`);
    },
  };
  return { store, claimed };
}

const readers: DigestRecipient[] = Array.from({ length: 5 }, (_, index) => ({
  userId: `user-${index}`,
  email: `reader${index}@example.com`,
  name: `Reader ${index}`,
}));

describe("runDigest", () => {
  it("sends everyone once, in batches, with working unsubscribe headers", async () => {
    const { store } = fakeStore(readers);
    const batches: OutgoingEmail[][] = [];
    const report = await runDigest(store, async (emails) => void batches.push(emails), { ...options, batchSize: 2 });

    expect(report).toEqual({ week: "2026-10-26", stories: 3, sent: 5, failed: 0 });
    expect(batches.map((batch) => batch.length)).toEqual([2, 2, 1]);
    const first = batches[0][0];
    expect(first.to).toBe("reader0@example.com");
    expect(first.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const oneClick = new URL(first.headers["List-Unsubscribe"].slice(1, -1));
    expect(oneClick.pathname).toBe("/api/digest/unsubscribe");
    expect(isValidUnsubscribeToken("user-0", oneClick.searchParams.get("t")!, SECRET)).toBe(true);

    // The same week again: nobody is left.
    const again = await runDigest(store, async () => {}, options);
    expect(again.sent).toBe(0);
  });

  it("gives claims back when a batch fails, so the next run sends them", async () => {
    const { store } = fakeStore(readers);
    const failed = await runDigest(store, async () => {
      throw new Error("quota");
    }, options);
    expect(failed).toMatchObject({ sent: 0, failed: 5 });

    const retried = await runDigest(store, async () => {}, options);
    expect(retried.sent).toBe(5);
  });

  it("sends nothing in a week without stories", async () => {
    const { store, claimed } = fakeStore(readers, []);
    let sends = 0;
    const report = await runDigest(store, async () => void sends++, options);
    expect(report.skipped).toBeTruthy();
    expect(sends).toBe(0);
    expect(claimed.size).toBe(0);
  });
});
