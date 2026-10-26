import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Checks a scheduled job's `Authorization: Bearer $CRON_SECRET` header (Vercel
 * Cron sends it automatically; pg_cron sends it from Supabase Vault). Returns
 * the error response to send, or null when the request may proceed.
 */
export function rejectUnlessCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set." }, { status: 503 });

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}
