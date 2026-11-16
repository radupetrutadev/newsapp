"use client";

import { Check, Plus } from "lucide-react";
import { useToggle } from "@/lib/store/engagement";
import { toast } from "@/lib/store/toast";
import { cn } from "@/lib/utils";

/**
 * Follow / Following button for a source (`list` "following", the default)
 * or a person ("people").
 */
export function FollowButton({
  id,
  list = "following",
  name,
  size = "sm",
  className,
}: {
  id: string;
  list?: "following" | "people";
  name: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [following, toggle] = useToggle(list, id);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!toggle()) return;
        toast(following ? `You unfollowed ${name}` : `You're now following ${name}`);
      }}
      aria-pressed={following}
      title={following ? `Unfollow ${name}` : undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-semibold transition-colors",
        size === "sm" ? "h-9 min-w-[96px] px-3.5 text-[13px]" : "h-10 min-w-[116px] px-4 text-[14px]",
        following
          ? "border border-border-strong bg-transparent text-foreground hover:border-live/50 hover:text-danger"
          : "bg-accent text-on-accent hover:bg-accent-hover",
        className,
      )}
    >
      {following ? <Check className="size-4" strokeWidth={2.5} /> : <Plus className="size-4" strokeWidth={2.5} />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
