"use client";

import Link from "next/link";
import { useToasts } from "@/lib/store/toast";

export function Toaster() {
  const toasts = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-toast-in flex items-center gap-4 rounded-md bg-accent px-4 py-3 text-[15px] font-medium text-white shadow-[0_0_15px_rgba(29,155,240,0.35)]"
        >
          {toast.message}
          {toast.action ? (
            <Link
              href={toast.action.href}
              className="pointer-events-auto font-bold whitespace-nowrap underline-offset-2 hover:underline"
            >
              {toast.action.label}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
