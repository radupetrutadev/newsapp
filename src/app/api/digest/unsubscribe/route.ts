import type { NextRequest } from "next/server";
import { unsubscribeFromDigest } from "@/lib/digest/unsubscribe";

/**
 * One-click unsubscribe (RFC 8058): email apps POST here from the
 * List-Unsubscribe header of a digest email. People clicking the link in the
 * email get the confirmation page at /unsubscribe instead.
 */
export async function POST(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const result = await unsubscribeFromDigest(params.get("u"), params.get("t"));
  const status = result === "done" ? 200 : result === "invalid" ? 400 : 500;
  return new Response(result === "done" ? "Unsubscribed from the weekly digest." : "Couldn't unsubscribe.", {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
