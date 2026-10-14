import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { TopicFollowButton } from "@/components/topics/topic-follow-button";
import { Cover } from "@/components/ui/cover";
import { categories } from "@/lib/categories";
import { getFeed } from "@/lib/data";

export const metadata: Metadata = { title: "Topics" };

export default async function TopicsPage() {
  const feed = await getFeed();
  const counts = new Map<string, number>();
  for (const article of feed) counts.set(article.category, (counts.get(article.category) ?? 0) + 1);

  return (
    <>
      <PageHeader title="Topics" subtitle="Follow topics to shape your feed" back="/" />

      <div className="border-b border-border px-4 py-5">
        <h2 className="text-[23px] leading-7 font-extrabold tracking-tight">
          What do you want to read about?
        </h2>
        <p className="mt-1 text-[15px] text-muted">
          Pick a few topics. You&apos;ll see more of them in For you, and you can change this any
          time.
        </p>
      </div>

      <ul>
        {categories.map((category) => {
          const Icon = category.icon;
          const count = counts.get(category.slug) ?? 0;
          return (
            <li key={category.slug} className="relative border-b border-border">
              <Link
                href={`/topics/${category.slug}`}
                className="absolute inset-0"
                aria-label={category.name}
              />
              <div className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                  <Cover seed={category.slug} category={category.slug} showIcon={false} className="absolute inset-0" />
                  <Icon className="absolute inset-0 m-auto size-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold">{category.name}</p>
                  <p className="line-clamp-1 text-[15px] text-muted">{category.description}</p>
                  <p className="text-[13px] text-muted">
                    {count} {count === 1 ? "story" : "stories"} today
                  </p>
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
