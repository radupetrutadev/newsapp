import "server-only";
import { isUuid } from "@/lib/activity";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isValidUnsubscribeToken } from "./token";

export type UnsubscribeResult = "done" | "invalid" | "failed";

/** Turns the weekly digest off for the reader an unsubscribe link was made for. */
export async function unsubscribeFromDigest(userId: unknown, token: unknown): Promise<UnsubscribeResult> {
  if (
    typeof userId !== "string" ||
    typeof token !== "string" ||
    !isUuid(userId) ||
    !isValidUnsubscribeToken(userId, token, process.env.CRON_SECRET ?? "")
  ) {
    return "invalid";
  }
  if (!isAdminConfigured()) return "failed";

  const { error } = await createAdminClient()
    .from("user_settings")
    .upsert({ user_id: userId, email_digest: false, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) {
    console.error(`Supabase: failed to unsubscribe ${userId} from the digest: ${error.message}`);
    return "failed";
  }
  return "done";
}
