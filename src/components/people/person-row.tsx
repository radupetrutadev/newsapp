import Link from "next/link";
import { FollowButton } from "@/components/source/follow-button";
import { UserAvatar } from "@/components/ui/avatar";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import type { UserProfile } from "@/lib/types";

/** A reader in a list: avatar, name, handle, optional bio and Follow. */
export function PersonRow({ person, showBio = false }: { person: UserProfile; showBio?: boolean }) {
  return (
    <div className="relative flex gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.04]">
      <Link href={`/user/${person.handle}`} className="absolute inset-0 rounded-xl" aria-label={person.name} />
      <UserAvatar user={person} size={44} className="relative" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[15px] leading-5 font-semibold">
              <span className="truncate">{person.name}</span>
              {person.verified ? <VerifiedBadge /> : null}
            </div>
            <div className="truncate text-[13px] text-muted">@{person.handle}</div>
          </div>
          <FollowButton id={person.id} list="people" name={person.name} className="relative" />
        </div>
        {showBio && person.bio ? <p className="mt-1.5 text-[14px] leading-5 text-foreground/75">{person.bio}</p> : null}
      </div>
    </div>
  );
}
