"use client";

import { useAdjustedCount } from "@/lib/store/engagement";
import type { Article } from "@/lib/types";
import { formatCount } from "@/lib/utils";

/** Repost, like and reply totals under a story. Like X, only non-zero counts are shown. */
export function EngagementStats({ article }: { article: Article }) {
  const reposts = useAdjustedCount("reposted", article.id, article.stats.reposts, article.countedAt);
  const likes = useAdjustedCount("liked", article.id, article.stats.likes, article.countedAt);
  const engagement = [
    { label: "Reposts", value: reposts },
    { label: "Likes", value: likes },
    { label: "Replies", value: article.stats.comments },
  ].filter(({ value }) => value > 0);

  if (engagement.length === 0) return null;

  return (
    <div className="mx-4 flex gap-5 border-t border-border py-4 text-[15px] text-muted">
      {engagement.map(({ label, value }) => (
        <span key={label}>
          <span className="font-bold text-foreground">{formatCount(value)}</span> {label}
        </span>
      ))}
    </div>
  );
}
