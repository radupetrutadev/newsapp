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
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition-colors",
        following
          ? "border border-[#536471] text-foreground hover:bg-white/10"
          : "bg-foreground text-black hover:bg-foreground/90",
        className,
      )}
    >
      {following ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" strokeWidth={3} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
