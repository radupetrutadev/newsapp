import { Clock, Layers, Zap } from "lucide-react";
import Link from "next/link";
import { SourceAvatar } from "@/components/ui/avatar";
import { TimeAgo } from "@/components/ui/time-ago";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { categoryName } from "@/lib/categories";
import { coverageLabel } from "@/lib/coverage";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArticleActions } from "./article-actions";
import { ArticleMedia } from "./article-media";

/**
 * A story in the feed, laid out like a post on X. The whole card links to
 * the article; nested links and buttons sit above that link.
 */
export function ArticleCard({
  article,
  showMedia = true,
  className,
}: {
  article: Article;
  showMedia?: boolean;
  className?: string;
}) {
  const { source } = article;
  const sourceHref = `/source/${source.handle}`;

  return (
    <article
      className={cn(
        "relative flex gap-3 border-b border-border px-4 pt-3 pb-2 transition-colors hover:bg-white/[0.03]",
        className,
      )}
    >
      <Link
        href={`/article/${article.slug}`}
        aria-label={article.title}
        className="absolute inset-0"
      />

      <Link href={sourceHref} className="relative h-fit shrink-0">
        <SourceAvatar source={source} size={40} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px] leading-5">
          <Link href={sourceHref} className="relative flex min-w-0 items-center gap-1">
            <span className="truncate font-bold hover:underline">{source.name}</span>
            {source.verified ? <VerifiedBadge variant="gold" /> : null}
            <span className="truncate text-muted">@{source.handle}</span>
          </Link>
          <span className="text-muted">·</span>
          <TimeAgo iso={article.publishedAt} className="shrink-0 text-muted" />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
          {article.isBreaking ? (
            <span className="inline-flex items-center gap-1 rounded bg-live px-1.5 py-px text-[11px] font-extrabold tracking-wider text-white uppercase">
              <Zap className="size-3 fill-current" /> Breaking
            </span>
          ) : null}
          <Link
            href={`/topics/${article.category}`}
            className="relative font-medium text-accent hover:underline"
          >
            {categoryName(article.category)}
          </Link>
          <span className="flex items-center gap-1 text-muted">
            <Clock className="size-3" /> {article.readTimeMinutes} min read
          </span>
        </div>

        <h2 className="mt-1.5 text-[17px] leading-[1.3] font-bold tracking-[-0.01em] text-pretty">
          {article.title}
        </h2>
        <p className="mt-1 line-clamp-3 text-[15px] leading-5 text-foreground/75">
          {article.summary}
        </p>

        {showMedia ? (
          <ArticleMedia article={article} className="mt-3 rounded-2xl border border-border" />
        ) : null}

        {article.coverage ? (
          <Link
            href={`/article/${article.slug}#coverage`}
            className="relative mt-2 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline"
          >
            <Layers className="size-3.5" /> Full coverage · {coverageLabel(article.coverage)}
          </Link>
        ) : null}

        <ArticleActions article={article} className="relative mt-2" />
      </div>
    </article>
  );
}
