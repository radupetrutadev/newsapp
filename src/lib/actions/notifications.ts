"use server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Marks the reader's notifications as read up to `upTo`, the newest one they
 * were shown; anything that arrived since stays unread. A no-op in demo mode,
 * where the browser remembers it.
 */
export async function markNotificationsRead(upTo: string): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured()) return { ok: true };
  if (typeof upTo !== "string" || !TIMESTAMP.test(upTo)) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", { up_to: upTo });
  if (error) {
    console.error(`Supabase: failed to mark notifications read: ${error.message}`);
    return { ok: false };
  }
  return { ok: true };
}
