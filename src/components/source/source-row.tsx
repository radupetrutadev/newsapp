import Link from "next/link";
import { SourceAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { Source } from "@/lib/types";
import { FollowButton } from "./follow-button";

/** "Who to follow" style row: avatar, name, handle, optional bio and Follow. */
export function SourceRow({ source, showBio = false }: { source: Source; showBio?: boolean }) {
  return (
    <div className="relative flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]">
      <Link
        href={`/source/${source.handle}`}
        className="absolute inset-0"
        aria-label={source.name}
      />
      <SourceAvatar source={source} size={40} className="relative" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[15px] font-bold">
              <span className="truncate">{source.name}</span>
              {source.verified ? <VerifiedBadge variant="gold" /> : null}
            </div>
            <div className="truncate text-[15px] text-muted">@{source.handle}</div>
          </div>
          <FollowButton sourceId={source.id} name={source.name} className="relative" />
        </div>
        {showBio ? (
          <p className="mt-1 text-[15px] leading-5 text-foreground/90">{source.description}</p>
        ) : null}
      </div>
    </div>
  );
}
