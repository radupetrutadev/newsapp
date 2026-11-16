"use client";

import { HISTORY_SIZE } from "@/lib/ranking";
import { createPersistentStore } from "./persistent-store";

/*
 * Demo mode: the stories opened in this browser, newest first, which "For you"
 * ranks by. Signed-in readers' history is kept on their account
 * (public.reading_history).
 */

const local = createPersistentStore<{ read: string[] }>("pulse:history:v1", { read: [] });

export function rememberRead(articleId: string) {
  local.setState(({ read }) => ({ read: [articleId, ...read.filter((id) => id !== articleId)].slice(0, HISTORY_SIZE) }));
}

export function readHistory(): string[] {
  return local.getSnapshot().read;
}

export function clearLocalHistory() {
  local.setState(() => ({ read: [] }));
}
