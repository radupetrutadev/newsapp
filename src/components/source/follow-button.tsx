"use client";

import { useState } from "react";
import { useToggle } from "@/lib/store/engagement";
import { toast } from "@/lib/store/toast";
import { cn } from "@/lib/utils";

/**
 * Follow / Following pill. Hovering "Following" turns it into a red
 * "Unfollow" button, just like X.
 */
export function FollowButton({
  sourceId,
  name,
  size = "sm",
  className,
}: {
  sourceId: string;
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [following, toggle] = useToggle("following", sourceId);
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setHovered(false);
        if (!toggle()) return;
        toast(following ? `You unfollowed ${name}` : `You're now following ${name}`);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-pressed={following}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-bold transition-colors",
        size === "sm" ? "h-8 min-w-[78px] px-4 text-sm" : "h-9 min-w-[104px] px-4 text-[15px]",
        following
          ? "border border-[#536471] text-foreground hover:border-[#67070f] hover:bg-live/10 hover:text-live"
          : "bg-foreground text-black hover:bg-foreground/90",
        className,
      )}
    >
      {following ? (hovered ? "Unfollow" : "Following") : "Follow"}
    </button>
  );
}
