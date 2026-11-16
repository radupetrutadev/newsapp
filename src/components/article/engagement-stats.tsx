"use client";

import { useAdjustedCount } from "@/lib/store/engagement";
import type { Article } from "@/lib/types";
import { formatCount } from "@/lib/utils";

/** Like, repost and reply totals under a story. Only non-zero counts are shown. */
export function EngagementStats({ article }: { article: Article }) {
  const reposts = useAdjustedCount("reposted", article.id, article.stats.reposts, article.countedAt);
  const likes = useAdjustedCount("liked", article.id, article.stats.likes, article.countedAt);
  const engagement = [
    { label: "Likes", value: likes },
    { label: "Reposts", value: reposts },
    { label: "Replies", value: article.stats.comments },
  ].filter(({ value }) => value > 0);

  if (engagement.length === 0) return null;

  return (
    <div className="flex gap-6 border-b border-border px-4 py-3.5 text-[14px] text-muted">
      {engagement.map(({ label, value }) => (
        <span key={label}>
          <span className="font-display text-[17px] font-semibold text-foreground">{formatCount(value)}</span> {label}
        </span>
      ))}
    </div>
  );
}
