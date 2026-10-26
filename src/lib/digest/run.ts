import type { Article } from "@/lib/types";
import { buildDigestEmail } from "./email";
import { unsubscribeToken } from "./token";

/*
 * The weekly digest run: the week's most-read stories, mailed to every reader
 * with the digest on. Each reader is claimed for the week before their email
 * goes out, so a second run that week (a retry, or two schedulers) skips
 * them; a batch that fails to send gives its claims back for the next run.
 */

export interface DigestRecipient {
  userId: string;
  email: string;
  name: string;
}

/** Persistence used by the run; Supabase in production, fakes in tests. */
export interface DigestStore {
  /** Most read first, published since `since` (ISO date). */
  topStories(since: string, limit: number): Promise<Article[]>;
  /** Readers with the digest on who haven't been claimed for `week`. */
  claimRecipients(week: string, max: number): Promise<DigestRecipient[]>;
  releaseRecipients(week: string, userIds: string[]): Promise<void>;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
}

/** Sends one batch, all or nothing; throws when it failed. */
export type SendBatch = (emails: OutgoingEmail[]) => Promise<void>;

export interface DigestOptions {
  siteName: string;
  siteUrl: string;
  /** Signs unsubscribe links (CRON_SECRET). */
  secret: string;
  now?: Date;
  /** Stop starting batches after this long, inside the route's time limit. */
  timeBudgetMs?: number;
  batchSize?: number;
  /** Between batches, for the email provider's rate limit. */
  pauseMs?: number;
}

export interface DigestReport {
  week: string;
  stories: number;
  sent: number;
  failed: number;
  /** Set when nothing was sent on purpose. */
  skipped?: string;
}

const STORIES = 10;
const WEEK_MS = 7 * 24 * 60 * 60_000;

/** The week a run belongs to: the Monday (UTC) it falls in, as YYYY-MM-DD. */
export function digestWeek(now: Date): string {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

export function unsubscribeLinks(siteUrl: string, userId: string, secret: string) {
  const query = new URLSearchParams({ u: userId, t: unsubscribeToken(userId, secret) });
  return {
    /** A page asking the reader to confirm. */
    page: new URL(`/unsubscribe?${query}`, siteUrl).toString(),
    /** Email apps' one-click unsubscribe (RFC 8058) posts here. */
    oneClick: new URL(`/api/digest/unsubscribe?${query}`, siteUrl).toString(),
  };
}

export async function runDigest(store: DigestStore, send: SendBatch, options: DigestOptions): Promise<DigestReport> {
  const now = options.now ?? new Date();
  const started = Date.now();
  const budget = options.timeBudgetMs ?? 45_000;
  const batchSize = options.batchSize ?? 100;
  const week = digestWeek(now);

  const stories = await store.topStories(new Date(now.getTime() - WEEK_MS).toISOString(), STORIES);
  const report: DigestReport = { week, stories: stories.length, sent: 0, failed: 0 };
  // Nothing to tell anyone; readers aren't claimed, so a later run can still send.
  if (stories.length === 0) return { ...report, skipped: "No stories were published this week." };

  for (let batch = 0; Date.now() - started < budget; batch++) {
    const recipients = await store.claimRecipients(week, batchSize);
    if (recipients.length === 0) break;
    if (batch > 0 && options.pauseMs) await new Promise((resolve) => setTimeout(resolve, options.pauseMs));

    const emails = recipients.map((recipient): OutgoingEmail => {
      const links = unsubscribeLinks(options.siteUrl, recipient.userId, options.secret);
      const email = buildDigestEmail({
        name: recipient.name,
        stories,
        siteName: options.siteName,
        siteUrl: options.siteUrl,
        unsubscribeUrl: links.page,
      });
      return {
        to: recipient.email,
        ...email,
        headers: {
          "List-Unsubscribe": `<${links.oneClick}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      };
    });

    try {
      await send(emails);
      report.sent += emails.length;
    } catch (error) {
      console.error("Digest: a batch failed to send", error);
      report.failed += emails.length;
      await store.releaseRecipients(
        week,
        recipients.map((recipient) => recipient.userId),
      );
      // The provider is refusing (quota, bad key, outage): stop until the next run.
      break;
    }
  }
  return report;
}
