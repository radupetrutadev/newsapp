import { isSupabaseConfigured } from "@/lib/supabase/config";

/*
 * Browser push. The VAPID key pair identifies this site to the browsers' push
 * services; generate one with `npx web-push generate-vapid-keys`. The public
 * half is safe to ship to the browser.
 */

export const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Whether readers can turn push on: it needs accounts and a VAPID key. */
export function isPushAvailable(): boolean {
  return isSupabaseConfigured() && vapidPublicKey.length > 0;
}

// The push services of Chrome (and other Chromium browsers), Firefox, Edge
// and Safari. Subscriptions pointing anywhere else are refused, so the server
// never posts to an address a reader made up.
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^([a-z0-9-]+\.)*push\.services\.mozilla\.com$/,
  /^([a-z0-9-]+\.)*notify\.windows\.com$/,
  /^([a-z0-9-]+\.)*push\.apple\.com$/,
];

export function isPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return false;
  try {
    const url = new URL(endpoint);
    return (
      url.protocol === "https:" &&
      url.port === "" &&
      url.username === "" &&
      PUSH_SERVICE_HOSTS.some((host) => host.test(url.hostname))
    );
  } catch {
    return false;
  }
}

/** The keys a browser's PushSubscription.toJSON() returns, base64url-encoded. */
const PUSH_KEY = /^[A-Za-z0-9_-]{16,128}={0,2}$/;

export function isPushKey(value: unknown): value is string {
  return typeof value === "string" && PUSH_KEY.test(value);
}
