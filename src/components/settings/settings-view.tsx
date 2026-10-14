"use client";

import {
  AtSign,
  BellRing,
  EyeOff,
  Image as ImageIcon,
  Mail,
  Moon,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SettingsRow, SettingsSection } from "./settings-primitives";
import { resetEngagement } from "@/lib/store/engagement";
import { resetSettings, updateSetting, useSettings, type Settings } from "@/lib/store/settings";
import { toast } from "@/lib/store/toast";

interface ToggleRow {
  key: keyof Settings;
  icon: LucideIcon;
  title: string;
  description: string;
}

const feedRows: ToggleRow[] = [
  {
    key: "showImages",
    icon: ImageIcon,
    title: "Show images",
    description: "Display photos and cover art on stories in your feed.",
  },
  {
    key: "showBreakingBanner",
    icon: Zap,
    title: "Breaking news banner",
    description: "Pin live breaking stories to the top of For you.",
  },
  {
    key: "autoplayVideo",
    icon: Play,
    title: "Autoplay video",
    description: "Play video previews automatically while you scroll.",
  },
  {
    key: "hideSensitive",
    icon: EyeOff,
    title: "Hide sensitive content",
    description: "Blur graphic images until you choose to view them.",
  },
];

const notificationRows: ToggleRow[] = [
  {
    key: "breakingAlerts",
    icon: BellRing,
    title: "Breaking news alerts",
    description: "Get notified the moment a major story breaks.",
  },
  {
    key: "dailyBrief",
    icon: Sparkles,
    title: "Daily brief",
    description: "A morning summary of the stories picked for you.",
  },
  {
    key: "repliesAndMentions",
    icon: AtSign,
    title: "Replies and mentions",
    description: "When someone replies to or mentions you.",
  },
  {
    key: "emailDigest",
    icon: Mail,
    title: "Weekly email digest",
    description: "The week's most-read stories, every Sunday.",
  },
];

function Toggles({ rows }: { rows: ToggleRow[] }) {
  const settings = useSettings();
  return rows.map((row) => (
    <SettingsRow
      key={row.key}
      icon={row.icon}
      title={row.title}
      description={row.description}
      control={
        <Switch
          label={row.title}
          checked={settings[row.key]}
          onCheckedChange={(value) => updateSetting(row.key, value)}
        />
      }
    />
  ));
}

export function SettingsView() {
  return (
    <>
      <SettingsSection title="Your feed" description="Choose what shows up as you scroll.">
        <Toggles rows={feedRows} />
      </SettingsSection>

      <SettingsSection
        id="notifications"
        title="Notifications"
        description="Pick what's worth interrupting you for."
      >
        <Toggles rows={notificationRows} />
      </SettingsSection>

      <SettingsSection title="Display">
        <SettingsRow
          icon={Moon}
          title="Lights out"
          description="Pulse is dark mode only, designed for true-black screens."
          control={<Switch label="Dark mode" checked disabled onCheckedChange={() => {}} />}
        />
      </SettingsSection>

      <SettingsSection title="Data on this device">
        <SettingsRow
          icon={RotateCcw}
          title="Reset preferences"
          description="Restore default settings and clear likes, reposts, bookmarks and follows saved in this browser."
          control={
            <button
              type="button"
              onClick={() => {
                if (!window.confirm("Reset all preferences on this device?")) return;
                resetSettings();
                resetEngagement();
                toast("Preferences reset");
              }}
              className="h-8 shrink-0 rounded-full border border-[#67070f] px-4 text-sm font-bold text-live transition-colors hover:bg-live/10"
            >
              Reset
            </button>
          }
        />
      </SettingsSection>
    </>
  );
}
