"use client";

import { useEffect } from "react";
import type { AccountActivity } from "@/lib/activity";
import { hydrateEngagement } from "@/lib/store/engagement";
import { hydrateSettings } from "@/lib/store/settings";

export function ActivityHydrator({ activity }: { activity: AccountActivity }) {
  useEffect(() => {
    hydrateEngagement(activity);
    hydrateSettings(activity);
  }, [activity]);

  return null;
}
