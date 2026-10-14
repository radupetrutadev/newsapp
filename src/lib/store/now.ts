"use client";

import { useSyncExternalStore } from "react";

/*
 * A shared clock for relative timestamps. The server snapshot is 0, which
 * tells callers to render a stable absolute date; after hydration every
 * <TimeAgo> ticks together from a single interval.
 */

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((notify) => notify());
    }, 30_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  if (now === 0) now = Date.now();
  return now;
}

/** Current time in ms on the client, 0 during SSR and hydration. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}

const emptySubscribe = () => () => {};

/** False during SSR and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
