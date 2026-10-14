"use client";

import { useNow } from "@/lib/store/now";
import { formatFullDate, formatRelativeTime, formatShortDate } from "@/lib/utils";

/** "12m" / "3h" after hydration; a stable short date on the server. */
export function TimeAgo({ iso, className }: { iso: string; className?: string }) {
  const now = useNow();
  return (
    <time dateTime={iso} title={formatFullDate(iso)} className={className}>
      {now === 0 ? formatShortDate(iso) : formatRelativeTime(iso, now)}
    </time>
  );
}
