"use client";

import Link from "next/link";
import { useToasts } from "@/lib/store/toast";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-toast-in flex items-center gap-4 rounded-xl border border-border-strong bg-elevated py-3 pr-4 pl-3 text-[14px] font-medium text-foreground shadow-[0_16px_40px_rgb(0_0_0/0.6)] before:h-5 before:w-1 before:rounded-full before:bg-accent"
        >
          {toast.message}
          {toast.action ? (
            <Link
              href={toast.action.href}
              className="pointer-events-auto font-semibold whitespace-nowrap text-accent underline-offset-2 hover:underline"
            >
              {toast.action.label}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
