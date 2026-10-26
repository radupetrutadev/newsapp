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
    <section id="coverage" aria-labelledby="coverage-heading" className="scroll-mt-16 border-b border-border px-4 py-4">
      <h2 id="coverage-heading" className="flex items-center gap-2 text-xl font-extrabold">
        <Layers className="size-5 text-accent" /> Full coverage
      </h2>
      <p className="mt-0.5 text-[15px] text-muted">
        {label} · first reported <TimeAgo iso={stories[0].publishedAt} />
      </p>

      <ol className="relative mt-4 space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-border">
        {stories.map((story) => {
          const current = story.id === article.id;
          return (
            <li key={story.id} className="relative pl-6">
              <span
                aria-hidden
                className={cn(
                  "absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-background",
                  current ? "bg-accent" : "bg-muted",
                )}
              />
              <div className="flex items-center gap-1.5 text-[13px] leading-4">
                <SourceAvatar source={story.source} size={16} />
                <Link href={`/source/${story.source.handle}`} className="font-bold hover:underline">
                  {story.source.name}
                </Link>
                <span className="text-muted">·</span>
                <TimeAgo iso={story.publishedAt} className="text-muted" />
              </div>
              {current ? (
                <p className="mt-1 text-[15px] leading-5 font-bold">
                  {story.title} <span className="font-normal text-muted">· You&apos;re reading this</span>
                </p>
              ) : (
                <Link href={`/article/${story.slug}`} className="mt-1 block text-[15px] leading-5 font-bold hover:underline">
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
