import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { TopicFollowButton } from "@/components/topics/topic-follow-button";
import { Cover } from "@/components/ui/cover";
import { categories } from "@/lib/categories";
import { getTopicStats } from "@/lib/data";
import { storyCount } from "@/lib/utils";

export const metadata: Metadata = { title: "Topics" };

export default async function TopicsPage() {
  const stats = await getTopicStats();

  return (
    <>
      <PageHeader title="Topics" subtitle="Follow topics to shape your feed" back="/" />

      <div className="px-4 pt-4 pb-5 md:px-0">
        <h2 className="font-display text-[28px] leading-8 font-semibold tracking-tight text-balance">
          What do you want to read about?
        </h2>
        <p className="mt-2 text-[15px] text-muted">
          Pick a few topics. You&apos;ll see more of them in For you, and you can change this any
          time.
        </p>
      </div>

      <ul className="grid gap-3 px-4 sm:grid-cols-2 md:px-0">
        {categories.map((category) => {
          const Icon = category.icon;
          const count = stats[category.slug]?.stories ?? 0;
          return (
            <li
              key={category.slug}
              className="relative overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              <Link href={`/topics/${category.slug}`} className="absolute inset-0 rounded-2xl" aria-label={category.name} />
              <div className="pointer-events-none relative h-20">
                <Cover seed={category.slug} category={category.slug} showIcon={false} className="absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent" />
                <span className="absolute bottom-0 left-4 flex size-10 items-center justify-center rounded-xl bg-background/60 ring-1 ring-white/10 backdrop-blur">
                  <Icon className="size-5" />
                </span>
              </div>
              <div className="flex items-start gap-3 p-4 pt-3">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[18px] font-semibold tracking-tight">{category.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-muted">{category.description}</p>
                  <p className="kicker mt-2 text-accent">{storyCount(count)} today</p>
                </div>
                <TopicFollowButton slug={category.slug} className="relative" />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
