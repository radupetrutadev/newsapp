"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { isPushAvailable } from "@/lib/push/config";
import { getPushState, resyncPush, turnOffPush, turnOnPush, type PushState } from "@/lib/push/browser";
import { useEngagementStatus } from "@/lib/store/engagement";
import { toast } from "@/lib/store/toast";
import { SettingsRow } from "./settings-primitives";

const descriptions: Record<PushState, string> = {
  unsupported: "This browser doesn't support push notifications.",
  "home-screen": "On iPhone and iPad, add Pulse to your Home Screen (Share → Add to Home Screen), then turn this on there.",
  blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then come back.",
  off: "Replies, likes, new followers and breaking news on this device, even when Pulse is closed.",
  on: "Replies, likes, new followers and breaking news on this device, even when Pulse is closed.",
};

/** Browser push for this device. Hidden unless the site has VAPID keys. */
export function PushSetting() {
  const status = useEngagementStatus();
  const signedIn = status === "ready";
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushAvailable()) return;
    let cancelled = false;
    void getPushState().then((current) => {
      if (cancelled) return;
      setState(current);
      // The server may have dropped an expired copy; this browser still has it.
      if (current === "on" && signedIn) void resyncPush();
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (!isPushAvailable()) return null;

  async function change(on: boolean) {
    setBusy(true);
    try {
      const result = on ? await turnOnPush() : await turnOffPush();
      toast(result.ok ? `Push notifications are ${on ? "on" : "off"} for this device` : result.error);
    } catch (error) {
      console.error(error);
      toast("This browser couldn't set up push notifications. Try again later.");
    } finally {
      setState(await getPushState());
      setBusy(false);
    }
  }

  const usable = state === "on" || state === "off";
  return (
    <SettingsRow
      icon={Smartphone}
      title="Push notifications"
      description={
        status === "signed-out"
          ? "Sign in to get notifications on this device."
          : state
            ? descriptions[state]
            : descriptions.off
      }
      control={
        <Switch
          label="Push notifications on this device"
          checked={state === "on"}
          disabled={!signedIn || !usable || busy}
          onCheckedChange={(on) => void change(on)}
        />
      }
    />
  );
}
