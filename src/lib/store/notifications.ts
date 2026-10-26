"use client";

import { useSyncExternalStore } from "react";
import { markNotificationsRead } from "@/lib/actions/notifications";
import type { AccountActivity } from "@/lib/activity";
import { mockNotifications } from "@/lib/mock/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPersistentStore } from "./persistent-store";

/*
 * The unread badge on Notifications.
 * - With Supabase: starts from what <ActivitySync> loaded, then asks
 *   /api/notifications/unread every 30 seconds while the tab is visible, as
 *   soon as the tab is shown again, and when a push arrives (the service
 *   worker posts a message).
 * - Demo mode: the mock notifications are unread until the reader opens
 *   Notifications in this browser.
 */

const POLL_MS = 30_000;
/** What the service worker posts to open tabs when a push arrives. */
export const PUSH_MESSAGE = "pulse:push";

const demo = !isSupabaseConfigured();
const demoSeen = createPersistentStore("pulse:notifications:v1", { seen: false });
const demoUnread = mockNotifications.filter((notification) => notification.unread).length;

let unread = 0;
let signedIn = false;
// Bumped when the reader reads everything, so a check already on its way
// can't bring back the old count.
let epoch = 0;
let checking = false;
const listeners = new Set<() => void>();

function setUnread(count: number) {
  if (count === unread) return;
  unread = count;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useUnreadCount(): number {
  const { seen } = demoSeen.useStore();
  const count = useSyncExternalStore(subscribe, () => unread, () => 0);
  return demo ? (seen ? 0 : demoUnread) : count;
}

/** Called by <ActivityHydrator> with what the server loaded for this page view. */
export function hydrateNotifications(activity: AccountActivity) {
  if (demo) return;
  signedIn = activity.status === "ready";
  setUnread(activity.status === "ready" ? activity.unreadNotifications : 0);
  if (signedIn) startChecking();
}

/** Asks the server for the current count. */
export async function refreshUnread() {
  if (demo || !signedIn || checking) return;
  checking = true;
  const started = epoch;
  try {
    const response = await fetch("/api/notifications/unread", { cache: "no-store" });
    if (!response.ok) return;
    const { count } = (await response.json()) as { count: number };
    if (started === epoch && Number.isInteger(count)) setUnread(count);
  } catch {
    // Offline or the server is busy; the next check will try again.
  } finally {
    checking = false;
  }
}

/**
 * The reader opened Notifications: everything up to `upTo` (the newest one
 * shown) is read. Undefined when there was nothing to show.
 */
export function markNotificationsSeen(upTo: string | undefined) {
  if (demo) {
    demoSeen.setState(() => ({ seen: true }));
    return;
  }
  epoch += 1;
  setUnread(0);
  if (!upTo) return;
  void markNotificationsRead(upTo).then(() => refreshUnread());
}

let checkingStarted = false;

function startChecking() {
  if (checkingStarted) return;
  checkingStarted = true;
  const check = () => {
    if (document.visibilityState === "visible") void refreshUnread();
  };
  window.setInterval(check, POLL_MS);
  document.addEventListener("visibilitychange", check);
  window.addEventListener("online", check);
  navigator.serviceWorker?.addEventListener("message", (event: MessageEvent) => {
    if ((event.data as { type?: string } | null)?.type === PUSH_MESSAGE) void refreshUnread();
  });
}
