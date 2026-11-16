"use client";

import {
  AtSign,
  BellRing,
  Eraser,
  EyeOff,
  History,
  Image as ImageIcon,
  Mail,
  Moon,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { startTransition } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { clearReadingHistory } from "@/lib/actions/activity";
import { PushSetting } from "./push-setting";
import { SettingsRow, SettingsSection } from "./settings-primitives";
import { resetEngagement, useEngagementStatus } from "@/lib/store/engagement";
import { clearLocalHistory } from "@/lib/store/history";
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
    description: "Play story videos, muted, while they're on screen in your feed.",
  },
  {
    key: "hideSensitive",
    icon: EyeOff,
    title: "Hide sensitive content",
    description: "Blur graphic or distressing photos and videos until you choose to see them.",
  },
  {
    key: "personalizeFeed",
    icon: History,
    title: "Learn from what you read",
    description: "Rank For you by the stories you open, so stories like them come first and ones you've read move down.",
  },
];

const notificationRows: ToggleRow[] = [
  {
    key: "breakingAlerts",
    icon: BellRing,
    title: "Breaking news alerts",
    description: "When a source or topic you follow breaks a major story.",
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
  // Signed out, no reading history is kept to learn from.
  const signedOut = useEngagementStatus() === "signed-out";
  const rows = signedOut ? feedRows.filter((row) => row.key !== "personalizeFeed") : feedRows;

  return (
    <>
      <SettingsSection title="Your feed" description="Choose what shows up as you scroll.">
        <Toggles rows={rows} />
        <ClearHistoryRow />
      </SettingsSection>

      <SettingsSection
        id="notifications"
        title="Notifications"
        description="Pick what's worth interrupting you for."
      >
        <PushSetting />
        <Toggles rows={notificationRows} />
      </SettingsSection>

      <SettingsSection title="Display">
        <SettingsRow
          icon={Moon}
          title="Dark theme"
          description="Pulse is dark only: warm black with an orange accent."
          control={<Switch label="Dark mode" checked disabled onCheckedChange={() => {}} />}
        />
      </SettingsSection>

      <ResetSection />
    </>
  );
}

function ClearHistoryRow() {
  const status = useEngagementStatus();
  const demo = status === "local";
  // Signed out, nothing is kept.
  if (!demo && status !== "ready") return null;

  return (
    <SettingsRow
      icon={Eraser}
      title="Clear reading history"
      description={demo ? "Forget the stories opened in this browser." : "Forget the stories you've opened."}
      control={
        <button
          type="button"
          onClick={() => {
            if (demo) {
              clearLocalHistory();
              toast("Reading history cleared");
              return;
            }
            startTransition(async () => {
              const result = await clearReadingHistory();
              toast(result.ok ? "Reading history cleared" : result.error);
            });
          }}
          className={buttonClasses({ variant: "outline", size: "sm", className: "shrink-0" })}
        >
          Clear
        </button>
      }
    />
  );
}

function ResetSection() {
  const status = useEngagementStatus();
  // Signed-in readers' settings live on their account; likes and follows are kept.
  const onAccount = status === "ready";
  const demo = status === "local";

  return (
    <SettingsSection title={onAccount ? "Your preferences" : "Data on this device"}>
      <SettingsRow
        icon={RotateCcw}
        title={onAccount ? "Reset settings" : "Reset preferences"}
        description={
          onAccount
            ? "Restore the default feed and notification settings on your account."
            : demo
              ? "Restore default settings and clear likes, reposts, bookmarks and follows saved in this browser."
              : "Restore the default settings in this browser."
        }
        control={
          <button
            type="button"
            onClick={() => {
              const question = onAccount
                ? "Reset your settings to the defaults?"
                : "Reset all preferences on this device?";
              if (!window.confirm(question)) return;
              resetSettings();
              if (demo) resetEngagement();
              toast(onAccount ? "Settings reset" : "Preferences reset");
            }}
            className={buttonClasses({ variant: "danger", size: "sm", className: "shrink-0" })}
          >
            Reset
          </button>
        }
      />
    </SettingsSection>
  );
}
