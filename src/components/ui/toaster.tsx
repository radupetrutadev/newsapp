"use client";

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
          className="animate-toast-in rounded-md bg-accent px-4 py-3 text-[15px] font-medium text-white shadow-[0_0_15px_rgba(29,155,240,0.35)]"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
