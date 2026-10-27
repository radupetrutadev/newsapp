"use client";

import { startTransition, useSyncExternalStore } from "react";
import { saveSettings } from "@/lib/actions/activity";
import type { AccountActivity } from "@/lib/activity";
import { defaultSettings, type Settings } from "@/lib/settings";
import { createPersistentStore } from "./persistent-store";
import { toast } from "./toast";

export { defaultSettings, type Settings };

/*
 * Reader preferences. A signed-in reader's settings are loaded by
 * <ActivitySync> and saved to their account; otherwise (demo mode, signed
 * out) they stay in this browser.
 */

const local = createPersistentStore<Settings>("pulse:settings:v1", defaultSettings);

let account: { userId: string; settings: Settings } | null = null;
const listeners = new Set<() => void>();

function setAccount(next: typeof account) {
  account = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  const unsubscribeLocal = local.subscribe(listener);
  listeners.add(listener);
  return () => {
    unsubscribeLocal();
    listeners.delete(listener);
  };
}

function getSnapshot(): Settings {
  return account?.settings ?? local.getSnapshot();
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSnapshot, local.getServerSnapshot);
}

/** The current settings, outside React. */
export function getSettings(): Settings {
  return getSnapshot();
}

/** Called by <ActivityHydrator>. Without a loaded account, browser settings apply. */
export function hydrateSettings(activity: AccountActivity) {
  if (activity.status !== "ready") {
    if (account) setAccount(null);
    return;
  }
  // Keep changes made in this tab when the same reader's page re-renders.
  if (account?.userId === activity.userId) return;
  setAccount({ userId: activity.userId, settings: activity.settings });
}

function save(changes: Partial<Settings>) {
  if (!account) {
    local.setState((current) => ({ ...current, ...changes }));
    return;
  }

  const { userId, settings: previous } = account;
  setAccount({ userId, settings: { ...previous, ...changes } });
  startTransition(async () => {
    const result = await saveSettings(changes);
    if (result.ok || account?.userId !== userId) return;
    // Put back only the values nothing else has changed since.
    const current = account.settings;
    const reverted = { ...current };
    for (const key of Object.keys(changes) as (keyof Settings)[]) {
      if (current[key] === changes[key]) reverted[key] = previous[key];
    }
    setAccount({ userId, settings: reverted });
    toast(result.error);
  });
}

export function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  save({ [key]: value });
}

export function resetSettings() {
  save(defaultSettings);
}
