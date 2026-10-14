"use client";

import { createPersistentStore } from "./persistent-store";

export interface Settings {
  showImages: boolean;
  showBreakingBanner: boolean;
  autoplayVideo: boolean;
  hideSensitive: boolean;
  breakingAlerts: boolean;
  dailyBrief: boolean;
  repliesAndMentions: boolean;
  emailDigest: boolean;
}

export const defaultSettings: Settings = {
  showImages: true,
  showBreakingBanner: true,
  autoplayVideo: false,
  hideSensitive: true,
  breakingAlerts: true,
  dailyBrief: true,
  repliesAndMentions: true,
  emailDigest: false,
};

const store = createPersistentStore<Settings>("pulse:settings:v1", defaultSettings);

export const useSettings = store.useStore;

export function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  store.setState((current) => ({ ...current, [key]: value }));
}

export function resetSettings() {
  store.setState(() => defaultSettings);
}
