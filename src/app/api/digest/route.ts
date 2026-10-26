import type { NextRequest } from "next/server";
import { rejectUnlessCron } from "@/lib/cron";
import { createResendSender, isEmailConfigured } from "@/lib/digest/resend";
import { runDigest } from "@/lib/digest/run";
import { createSupabaseDigestStore } from "@/lib/digest/supabase-store";
import { site } from "@/lib/site";
import { isAdminConfigured } from "@/lib/supabase/admin";

export const maxDuration = 60;

/**
 * Mails the weekly digest to every reader who turned it on. Scheduled for
 * Sunday mornings in vercel.json; Vercel Cron sends GET with
 * `Authorization: Bearer $CRON_SECRET`. Running it again the same week only
 * reaches readers who haven't had that week's email.
 */
export async function GET(request: NextRequest) {
  return digest(request);
}

export async function POST(request: NextRequest) {
  return digest(request);
}

async function digest(request: NextRequest) {
  const rejected = rejectUnlessCron(request);
  if (rejected) return rejected;
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY to send the digest." },
      { status: 503 },
    );
  }
  if (!isEmailConfigured()) {
    return Response.json({ error: "Set RESEND_API_KEY and DIGEST_FROM to send the digest." }, { status: 503 });
  }

  const report = await runDigest(createSupabaseDigestStore(), createResendSender(), {
    siteName: site.name,
    siteUrl: site.url,
    secret: process.env.CRON_SECRET ?? "",
    pauseMs: 600,
  });
  return Response.json(report, { status: report.failed > 0 ? 502 : 200 });
}
