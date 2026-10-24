import type { Row } from "@/lib/supabase/database.types";

/** Reader preferences. Saved to the account when signed in, otherwise in this browser. */
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

// Keep in sync with the column defaults of public.user_settings.
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

type SettingsColumn = Exclude<keyof Row<"user_settings">, "user_id" | "updated_at">;

/** user_settings column for each setting. */
export const settingsColumns: Record<keyof Settings, SettingsColumn> = {
  showImages: "show_images",
  showBreakingBanner: "show_breaking_banner",
  autoplayVideo: "autoplay_video",
  hideSensitive: "hide_sensitive",
  breakingAlerts: "breaking_alerts",
  dailyBrief: "daily_brief",
  repliesAndMentions: "replies_and_mentions",
  emailDigest: "email_digest",
};

export const settingsKeys = Object.keys(settingsColumns) as (keyof Settings)[];

export function mapSettings(row: Row<"user_settings"> | null): Settings {
  const settings = { ...defaultSettings };
  if (row) for (const key of settingsKeys) settings[key] = row[settingsColumns[key]];
  return settings;
}
