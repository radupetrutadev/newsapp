import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { runIngest } from "@/lib/ingest/run";
import { createSupabaseIngestStore } from "@/lib/ingest/supabase-store";
import { site } from "@/lib/site";
import { isAdminConfigured } from "@/lib/supabase/admin";

// Fetching every feed can take a while on a cold start.
export const maxDuration = 60;

/**
 * Polls all RSS/Atom feeds and stores new stories. Call it on a schedule
 * (Supabase pg_cron, Vercel Cron, …) with `Authorization: Bearer $CRON_SECRET`.
 * Vercel Cron sends GET; other schedulers can use POST.
 */
export async function GET(request: NextRequest) {
  return ingest(request);
}

export async function POST(request: NextRequest) {
  return ingest(request);
}

async function ingest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  }
  if (!isAuthorized(request.headers.get("authorization"), secret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY to enable ingestion." },
      { status: 503 },
    );
  }

  const report = await runIngest(createSupabaseIngestStore(), {
    userAgent: `PulseBot/1.0 (+${site.url})`,
  });

  // Serve the current pages while fresh ones render in the background.
  if (report.added > 0) revalidateTag("articles", "max");
  revalidateTag("trends", "max");

  return Response.json(report);
}

function isAuthorized(header: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header ?? "");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
