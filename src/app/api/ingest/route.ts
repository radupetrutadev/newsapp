import { revalidateTag } from "next/cache";
import type { NextRequest } from "next/server";
import { rejectUnlessCron } from "@/lib/cron";
import { runIngest } from "@/lib/ingest/run";
import { createSupabaseIngestStore } from "@/lib/ingest/supabase-store";
import { deliverPush, type PushReport } from "@/lib/push/send";
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
  const rejected = rejectUnlessCron(request);
  if (rejected) return rejected;
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
  if (report.added > 0 || report.clustered > 0) revalidateTag("articles", "max");
  revalidateTag("trends", "max");

  // Breaking stories just stored notify their followers; this also sends
  // anything an earlier delivery missed.
  let push: PushReport | { error: string };
  try {
    push = await deliverPush();
  } catch (error) {
    console.error(error);
    push = { error: "Push delivery failed; see the logs." };
  }

  return Response.json({ ...report, push });
}
