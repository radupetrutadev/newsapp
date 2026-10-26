"use client";

import { useAdjustedCount } from "@/lib/store/engagement";
import type { PublicProfile, Source } from "@/lib/types";
import { formatCount } from "@/lib/utils";

type Followed = Pick<Source | PublicProfile, "id" | "followersCount" | "countedAt">;

/**
 * Follower count of a source (`list` "following", the default) or a person
 * ("people"), including the reader's own follow straight away. With `noun`
 * it renders "Follower" or "Followers" to go with the count instead.
 */
export function FollowerCount({
  of,
  list = "following",
  noun = false,
}: {
  of: Followed;
  list?: "following" | "people";
  noun?: boolean;
}) {
  const count = useAdjustedCount(list, of.id, of.followersCount, of.countedAt);
  if (noun) return <>{count === 1 ? "Follower" : "Followers"}</>;
  return <>{formatCount(count)}</>;
}
