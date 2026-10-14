"use client";

import { useHydrated } from "@/lib/store/now";
import { formatFullDate } from "@/lib/utils";

const localTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const localDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** "10:42 AM · Oct 14, 2026" in the reader's time zone once hydrated. */
export function ArticleTimestamp({ iso }: { iso: string }) {
  const hydrated = useHydrated();
  const date = new Date(iso);

  return (
    <time dateTime={iso}>
      {hydrated ? `${localTime.format(date)} · ${localDate.format(date)}` : formatFullDate(iso)}
    </time>
  );
}
