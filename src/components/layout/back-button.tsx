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
      className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
