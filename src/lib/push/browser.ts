"use client";

import { deletePushSubscription, savePushSubscription, type PushResult } from "@/lib/actions/push";
import { vapidPublicKey } from "./config";

/*
 * Push in this browser: the service worker (public/sw.js), the browser's
 * subscription and the copy saved to the reader's account.
 */

export type PushState =
  /** No Push API in this browser. */
  | "unsupported"
  /** Safari on iPhone or iPad, which offers push once Pulse is on the Home Screen. */
  | "home-screen"
  /** The reader blocked notifications for this site. */
  | "blocked"
  | "off"
  | "on";

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function needsHomeScreen(): boolean {
  if (typeof window === "undefined") return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && !window.matchMedia("(display-mode: standalone)").matches;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  return (await registration?.pushManager.getSubscription()) ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (!isPushSupported()) return needsHomeScreen() ? "home-screen" : "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  return (await currentSubscription()) ? "on" : "off";
}

/** Saves an existing subscription again, e.g. after the server dropped an expired copy. */
export async function resyncPush(): Promise<void> {
  const subscription = isPushSupported() && Notification.permission === "granted" ? await currentSubscription() : null;
  if (subscription) await savePushSubscription(subscription.toJSON());
}

function applicationServerKey(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

/** Asks for permission, subscribes this browser and saves it to the account. */
export async function turnOnPush(): Promise<PushResult> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      error:
        permission === "denied"
          ? "Notifications are blocked for this site. Allow them in your browser's site settings."
          : "Allow notifications to get them on this device.",
    };
  }

  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(vapidPublicKey),
    }));

  const result = await savePushSubscription(subscription.toJSON());
  if (!result.ok) await subscription.unsubscribe();
  return result;
}

/** Stops pushes to this browser. Signing out calls it too. */
export async function turnOffPush(): Promise<PushResult> {
  if (!isPushSupported()) return { ok: true };
  const subscription = await currentSubscription();
  if (!subscription) return { ok: true };
  const result = await deletePushSubscription(subscription.endpoint);
  // Unsubscribing makes the push service refuse further pushes even if the
  // server's copy couldn't be deleted; the sender then drops it.
  await subscription.unsubscribe();
  return result;
}
