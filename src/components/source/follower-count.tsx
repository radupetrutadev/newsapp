"use client";

import { useAdjustedCount } from "@/lib/store/engagement";
import type { Source } from "@/lib/types";
import { formatCount } from "@/lib/utils";

/** A source's follower count, including the reader's own follow straight away. */
export function FollowerCount({ source }: { source: Pick<Source, "id" | "followersCount" | "countedAt"> }) {
  const count = useAdjustedCount("following", source.id, source.followersCount, source.countedAt);
  return <>{formatCount(count)}</>;
}
