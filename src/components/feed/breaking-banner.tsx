import { ArrowRight } from "lucide-react";
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

/** The "Live" strip pinned to the top of the feed for breaking stories. */
export function BreakingBanner({ article }: { article: Article }) {
  return (
    <div className="px-4 pb-3 md:px-0">
      <Link
        href={`/article/${article.slug}`}
        className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-live/30 bg-[linear-gradient(100deg,rgb(255_59_48/0.18),rgb(255_106_26/0.06)_55%,transparent)] px-4 py-3.5 transition-colors hover:border-live/50"
      >
        <span className="kicker flex shrink-0 items-center gap-2 rounded-full bg-live/15 px-2.5 py-1 text-live ring-1 ring-live/30">
          <LiveDot /> Live
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 font-display text-[16px] leading-5 font-semibold">{article.title}</span>
          <span className="mt-1 block text-[12px] text-muted">
            {article.source.name} · <TimeAgo iso={article.publishedAt} />
            {article.stats.views > 0 ? ` · ${formatCount(article.stats.views)} reading now` : null}
          </span>
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] transition-colors group-hover:bg-live group-hover:text-white">
          <ArrowRight className="size-4" />
        </span>
      </Link>
    </div>
  );
}
