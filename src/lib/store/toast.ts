"use client";

import { useSyncExternalStore } from "react";

export interface ToastAction {
  label: string;
  href: string;
}

export interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const empty: Toast[] = [];

function emit() {
  listeners.forEach((listener) => listener());
}

/** Show a toast at the bottom of the screen, optionally with a link. */
export function toast(message: string, action?: ToastAction) {
  const id = nextId++;
  toasts = [...toasts, { id, message, action }];
  emit();
  setTimeout(
    () => {
      toasts = toasts.filter((item) => item.id !== id);
      emit();
    },
    action ? 5_000 : 3_000,
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    subscribe,
    () => toasts,
    () => empty,
  );
}
