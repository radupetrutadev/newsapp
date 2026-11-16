import { Layers } from "lucide-react";
import Link from "next/link";
import { SourceAvatar } from "@/components/ui/avatar";
import { TimeAgo } from "@/components/ui/time-ago";
import { coverageLabel } from "@/lib/coverage";
import type { Article } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Every publisher's story about this event, oldest first, with the one being read marked. */
export function FullCoverage({ article, stories }: { article: Article; stories: Article[] }) {
  if (stories.length < 2) return null;
  const label = coverageLabel({
    clusterId: "",
    stories: stories.length,
    sources: new Set(stories.map((story) => story.source.id)).size,
  });

  return (
    <section
      id="coverage"
      aria-labelledby="coverage-heading"
      className="mx-4 mt-6 scroll-mt-24 rounded-2xl border border-border bg-surface p-5 md:mx-0 md:scroll-mt-40"
    >
      <h2 id="coverage-heading" className="flex items-center gap-2.5 font-display text-[22px] font-semibold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Layers className="size-[18px]" />
        </span>
        Full coverage
      </h2>
      <p className="mt-2 text-[14px] text-muted">
        {label} · first reported <TimeAgo iso={stories[0].publishedAt} />
      </p>

      <ol className="relative mt-5 space-y-5 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border-strong">
        {stories.map((story) => {
          const current = story.id === article.id;
          return (
            <li key={story.id} className="relative pl-6">
              <span
                aria-hidden
                className={cn(
                  "absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-surface",
                  current ? "bg-accent ring-4 ring-accent/20" : "bg-muted",
                )}
              />
              <div className="flex items-center gap-1.5 text-[13px] leading-4">
                <SourceAvatar source={story.source} size={16} />
                <Link href={`/source/${story.source.handle}`} className="font-semibold hover:underline">
                  {story.source.name}
                </Link>
                <span className="text-muted">·</span>
                <TimeAgo iso={story.publishedAt} className="text-muted" />
              </div>
              {current ? (
                <p className="mt-1.5 font-display text-[16px] leading-[1.3] font-semibold">
                  {story.title} <span className="font-sans text-[13px] font-normal text-accent">· You&apos;re reading this</span>
                </p>
              ) : (
                <Link href={`/article/${story.slug}`} className="mt-1.5 block font-display text-[16px] leading-[1.3] font-semibold transition-colors hover:text-accent">
                  {story.title}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
