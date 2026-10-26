import "server-only";
import { after } from "next/server";
import webpush, { WebPushError } from "web-push";
import { toAppNotification, toPushMessage, type NotificationJson } from "@/lib/notifications";
import { site } from "@/lib/site";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isPushEndpoint, vapidPublicKey } from "./config";

/*
 * Sends notifications to readers' browsers. Rows come from the database
 * triggers; claim_push_notifications hands each one out once, so senders
 * running at the same time never send twice. Runs after actions that notify
 * someone (sendPushSoon) and after each ingestion run, which also catches
 * anything an earlier send missed.
 */

const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";
// Push services contact this address if the site misbehaves.
const vapidSubject = process.env.VAPID_SUBJECT ?? site.url;

const BATCH_SIZE = 100;
const MAX_BATCHES = 5;
const CONCURRENCY = 10;
/** Undelivered pushes expire: a phone that's off for a day doesn't need them all. */
const TTL_SECONDS = 6 * 60 * 60;

export function isPushConfigured(): boolean {
  return isAdminConfigured() && vapidPublicKey.length > 0 && vapidPrivateKey.length > 0;
}

/** Delivers pending notifications once the current response has been sent. */
export function sendPushSoon() {
  if (!isPushConfigured()) return;
  after(() =>
    deliverPush().catch((error: unknown) => {
      console.error("Push: delivery failed", error);
    }),
  );
}

export interface PushReport {
  sent: number;
  failed: number;
  /** Subscriptions the push service says are gone (the reader turned push off). */
  removed: number;
}

/** Sends everything waiting. Without VAPID keys the queue is just emptied. */
export async function deliverPush(): Promise<PushReport> {
  const report: PushReport = { sent: 0, failed: 0, removed: 0 };
  if (!isAdminConfigured()) return report;
  const db = createAdminClient();

  for (let batch = 0; batch < MAX_BATCHES; batch++) {
    const { data, error } = await db.rpc("claim_push_notifications", { max_count: BATCH_SIZE });
    if (error) throw new Error(`Failed to claim push notifications: ${error.message}`);
    const claimed = data as unknown as (NotificationJson & { user_id: string })[];
    if (claimed.length === 0) break;
    if (isPushConfigured()) await sendBatch(db, claimed, report);
    // A short batch means the queue is empty; the next run picks up the rest.
    if (claimed.length < BATCH_SIZE) break;
  }
  return report;
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function sendBatch(
  db: AdminClient,
  claimed: (NotificationJson & { user_id: string })[],
  report: PushReport,
) {
  const readers = [...new Set(claimed.map((row) => row.user_id))];
  const { data: subscriptions, error } = await db
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth_key")
    .in("user_id", readers);
  if (error) throw new Error(`Failed to load push subscriptions: ${error.message}`);

  const jobs: (() => Promise<void>)[] = [];
  for (const row of claimed) {
    const notification = toAppNotification(row);
    if (!notification) continue;
    // Links are paths on this site; the service worker opens them in a tab.
    const payload = JSON.stringify(toPushMessage(notification));
    for (const subscription of subscriptions) {
      if (subscription.user_id !== row.user_id || !isPushEndpoint(subscription.endpoint)) continue;
      jobs.push(async () => {
        try {
          await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
            payload,
            {
              vapidDetails: { subject: vapidSubject, publicKey: vapidPublicKey, privateKey: vapidPrivateKey },
              TTL: TTL_SECONDS,
              urgency: notification.kind === "breaking" ? "high" : "normal",
              // A newer push for the same row replaces one still waiting on the device.
              topic: notification.id.replaceAll("-", ""),
              timeout: 10_000,
            },
          );
          report.sent += 1;
        } catch (cause) {
          if (cause instanceof WebPushError && (cause.statusCode === 404 || cause.statusCode === 410)) {
            report.removed += 1;
            await db.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
            return;
          }
          report.failed += 1;
          console.error(`Push: couldn't reach ${new URL(subscription.endpoint).host}`, cause);
        }
      });
    }
  }

  for (let start = 0; start < jobs.length; start += CONCURRENCY) {
    await Promise.all(jobs.slice(start, start + CONCURRENCY).map((job) => job()));
  }
}
