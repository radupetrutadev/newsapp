"use client";

import { Check, Plus } from "lucide-react";
import { useToggle } from "@/lib/store/engagement";
import { cn } from "@/lib/utils";

export function TopicFollowButton({
  slug,
  className,
}: {
  slug: string;
  className?: string;
}) {
  const [following, toggle] = useToggle("topics", slug);

  return (
    <button
      type="button"
      aria-pressed={following}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      }}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition-colors",
        following
          ? "border border-border-strong bg-background/40 text-foreground hover:bg-white/[0.06]"
          : "bg-accent text-on-accent hover:bg-accent-hover",
        className,
      )}
    >
      {following ? <Check className="size-4" strokeWidth={2.5} /> : <Plus className="size-4" strokeWidth={2.5} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
