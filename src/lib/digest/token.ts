import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Unsubscribe links in digest emails carry the reader's id and a signature
 * made with CRON_SECRET, so a link works without signing in but only for the
 * reader it was sent to. Changing CRON_SECRET makes older links invalid.
 */

export function unsubscribeToken(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`pulse:digest-unsubscribe:${userId}`).digest("base64url");
}

export function isValidUnsubscribeToken(userId: string, token: string, secret: string): boolean {
  if (!secret) return false;
  const expected = Buffer.from(unsubscribeToken(userId, secret));
  const received = Buffer.from(token);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

