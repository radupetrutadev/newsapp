"use client";

import { startTransition, useEffect } from "react";
import { recordView } from "@/lib/actions/activity";
import { rememberRead } from "@/lib/store/history";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const STORAGE_KEY = "pulse:views:v1";

/**
 * Counts a view of the story, once per day in this browser, which also adds it
 * to a signed-in reader's history. In demo mode the story is remembered in this
 * browser instead, for "For you". Renders nothing.
 */
export function RecordView({ articleId }: { articleId: string }) {
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      rememberRead(articleId);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    let seen: Record<string, string> = {};
    try {
      const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
      if (stored && typeof stored === "object") seen = stored as Record<string, string>;
    } catch {
      // Unreadable storage: count the view anyway.
    }
    if (seen[articleId] === today) return;

    // Only today's entries matter, so drop the rest to keep the record small.
    const next = Object.fromEntries(Object.entries(seen).filter(([, day]) => day === today));
    next[articleId] = today;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable (private mode, quota).
    }
    startTransition(() => recordView(articleId));
  }, [articleId]);

  return null;
}
