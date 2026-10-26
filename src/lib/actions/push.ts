"use server";

import { getViewer } from "@/lib/data/viewer";
import { isPushAvailable, isPushEndpoint, isPushKey } from "@/lib/push/config";
import { createClient } from "@/lib/supabase/server";

export type PushResult = { ok: true } | { ok: false; error: string };

/** What PushSubscription.toJSON() returns in the browser. */
export interface PushSubscriptionJson {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

/** Saves this browser's push subscription for the signed-in reader. */
export async function savePushSubscription(subscription: PushSubscriptionJson): Promise<PushResult> {
  if (!isPushAvailable()) return { ok: false, error: "Push notifications aren't set up on this site." };
  const { endpoint, keys } = subscription ?? {};
  if (!isPushEndpoint(endpoint) || !isPushKey(keys?.p256dh) || !isPushKey(keys?.auth)) {
    return { ok: false, error: "This browser's push service isn't supported." };
  }
  if (!(await getViewer())) return { ok: false, error: "Sign in to turn on push notifications." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    endpoint,
    p256dh: keys.p256dh,
    auth_key: keys.auth,
  });
  if (error) {
    console.error(`Supabase: failed to save a push subscription: ${error.message}`);
    return { ok: false, error: "Couldn't turn on push notifications. Try again." };
  }
  return { ok: true };
}

/** Forgets a browser, when push is turned off there or its reader signs out. */
export async function deletePushSubscription(endpoint: string): Promise<PushResult> {
  if (!isPushAvailable() || !isPushEndpoint(endpoint)) return { ok: true };
  const supabase = await createClient();
  // RLS limits this to the reader's own browsers.
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) {
    console.error(`Supabase: failed to delete a push subscription: ${error.message}`);
    return { ok: false, error: "Couldn't turn off push notifications. Try again." };
  }
  return { ok: true };
}
