"use client";

import { useEffect } from "react";
import type { AccountActivity } from "@/lib/activity";
import { hydrateEngagement } from "@/lib/store/engagement";
import { hydrateNotifications } from "@/lib/store/notifications";
import { hydrateSettings } from "@/lib/store/settings";

export function ActivityHydrator({ activity }: { activity: AccountActivity }) {
  useEffect(() => {
    hydrateEngagement(activity);
    hydrateSettings(activity);
    hydrateNotifications(activity);
  }, [activity]);

  return null;
}
