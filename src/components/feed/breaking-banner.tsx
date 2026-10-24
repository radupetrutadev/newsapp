import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { TimeAgo } from "@/components/ui/time-ago";
import type { Article } from "@/lib/types";
import { formatCount } from "@/lib/utils";

export function LiveDot() {
  return (
    <span className="relative flex size-2">
      <span className="animate-live-ping absolute inline-flex size-full rounded-full bg-live" />
      <span className="relative inline-flex size-2 rounded-full bg-live" />
    </span>
  );
}

/** Red "Live" strip pinned to the top of the feed for breaking stories. */
export function BreakingBanner({ article }: { article: Article }) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="group relative flex items-center gap-3 overflow-hidden border-b border-border bg-gradient-to-r from-live/20 via-live/[0.07] to-transparent px-4 py-3 transition-colors hover:from-live/25"
    >
      <span className="flex shrink-0 items-center gap-2 rounded-full bg-live/15 px-2.5 py-1 text-[12px] font-extrabold tracking-wider text-live uppercase ring-1 ring-live/30">
        <LiveDot /> Live
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[15px] leading-5 font-bold">{article.title}</span>
        <span className="mt-0.5 block text-[13px] text-muted">
          {article.source.name} · <TimeAgo iso={article.publishedAt} />
          {article.stats.views > 0 ? ` · ${formatCount(article.stats.views)} reading now` : null}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
