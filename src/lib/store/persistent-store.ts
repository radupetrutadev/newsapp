"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny localStorage-backed store for per-browser UI state.
 * The server (and hydration) always render `defaults`, then the client
 * switches to whatever is stored — useSyncExternalStore handles the swap
 * without hydration mismatches.
 */
export function createPersistentStore<T extends object>(key: string, defaults: T) {
  let state: T | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    if (state) return state;
    try {
      const raw = window.localStorage.getItem(key);
      state = raw ? { ...defaults, ...(JSON.parse(raw) as Partial<T>) } : defaults;
    } catch {
      state = defaults;
    }
    return state;
  }

  function setState(update: (current: T) => T) {
    state = update(read());
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage can be unavailable (private mode, quota); keep in-memory state.
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      state = null;
      listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  const getServerSnapshot = () => defaults;

  function useStore(): T {
    return useSyncExternalStore(subscribe, read, getServerSnapshot);
  }

  return { useStore, setState, subscribe, getSnapshot: read, getServerSnapshot };
}
