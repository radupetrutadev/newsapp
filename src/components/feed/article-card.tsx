import { Layers, Zap } from "lucide-react";
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
 * A story in a list: its media across the top, then the source, headline and
 * summary, and the reader's actions along the bottom. The whole card links to
 * the story; nested links and buttons sit above that link.
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
        "group/card relative overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-border-strong hover:bg-surface-hover",
        className,
      )}
    >
      <Link href={`/article/${article.slug}`} aria-label={article.title} className="absolute inset-0 rounded-2xl" />

      {showMedia ? (
        // Clicks on the media go through to the story link (the media's own buttons still work).
        <div className="pointer-events-none relative">
          <ArticleMedia article={article} sizes="(min-width: 768px) 720px, 100vw" className="aspect-[16/8]" />
          {article.isBreaking ? (
            <span className="kicker absolute top-3 left-3 inline-flex items-center gap-1 rounded-md bg-live px-2 py-1 text-white shadow-lg">
              <Zap className="size-3 fill-current" /> Breaking
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="px-4 pt-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <Link href={sourceHref} className="relative shrink-0">
            <SourceAvatar source={source} size={32} />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <Link href={sourceHref} className="relative flex min-w-0 items-center gap-1 text-[14px] font-semibold">
              <span className="truncate hover:underline">{source.name}</span>
              {source.verified ? <VerifiedBadge variant="source" /> : null}
            </Link>
            <p className="mt-0.5 text-[12px] text-muted">
              <TimeAgo iso={article.publishedAt} /> · {article.readTimeMinutes} min read
            </p>
          </div>
          {!showMedia && article.isBreaking ? (
            <span className="kicker inline-flex shrink-0 items-center gap-1 rounded-md bg-live px-2 py-1 text-white">
              <Zap className="size-3 fill-current" /> Breaking
            </span>
          ) : null}
          <Link
            href={`/topics/${article.category}`}
            className="kicker relative shrink-0 rounded-full border border-accent/30 px-2.5 py-1 text-accent transition-colors hover:bg-accent/10"
          >
            {categoryName(article.category)}
          </Link>
        </div>

        <h2 className="mt-3 font-display text-[20px] leading-[1.2] font-semibold tracking-[-0.015em] text-pretty sm:text-[22px]">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-[15px] leading-6 text-foreground/70">{article.summary}</p>

        {article.coverage ? (
          <Link
            href={`/article/${article.slug}#coverage`}
            className="relative mt-3 inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/[0.08] px-2.5 py-1.5 text-[13px] font-semibold text-accent transition-colors hover:bg-accent/15"
          >
            <Layers className="size-3.5" /> Full coverage · {coverageLabel(article.coverage)}
          </Link>
        ) : null}
      </div>

      <ArticleActions article={article} className="relative mt-3 border-t border-border px-2 py-1.5 sm:px-3" />
    </article>
  );
}
