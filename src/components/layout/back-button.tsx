"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function BackButton({ fallbackHref = "/" }: { fallbackHref?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallbackHref);
      }}
      className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface transition-colors hover:border-border-strong hover:bg-surface-hover"
    >
      <ArrowLeft className="size-[18px]" />
    </button>
  );
}
