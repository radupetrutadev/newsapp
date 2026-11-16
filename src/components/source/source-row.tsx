import Link from "next/link";
import { SourceAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { Source } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FollowButton } from "./follow-button";

/** A source in a list: logo, name, handle, optional bio and Follow. */
export function SourceRow({
  source,
  showBio = false,
  compact = false,
}: {
  source: Source;
  showBio?: boolean;
  /** Smaller, for the side rail. */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-xl transition-colors hover:bg-white/[0.04]",
        compact ? "px-3 py-2.5" : "px-4 py-3",
      )}
    >
      <Link href={`/source/${source.handle}`} className="absolute inset-0 rounded-xl" aria-label={source.name} />
      <SourceAvatar source={source} size={compact ? 36 : 44} className="relative" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[15px] leading-5 font-semibold">
              <span className="truncate">{source.name}</span>
              {source.verified ? <VerifiedBadge variant="source" /> : null}
            </div>
            <div className="truncate text-[13px] text-muted">@{source.handle}</div>
          </div>
          <FollowButton
            id={source.id}
            name={source.name}
            className={cn("relative", compact && "h-8 min-w-0 px-2.5")}
          />
        </div>
        {showBio ? <p className="mt-1.5 text-[14px] leading-5 text-foreground/75">{source.description}</p> : null}
      </div>
    </div>
  );
}
