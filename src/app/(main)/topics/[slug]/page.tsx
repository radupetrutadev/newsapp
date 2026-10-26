import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FeedList } from "@/components/feed/feed-list";
import { PageHeader } from "@/components/layout/page-header";
import { TopicFollowButton } from "@/components/topics/topic-follow-button";
import { Cover } from "@/components/ui/cover";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedSkeleton, Skeleton } from "@/components/ui/skeleton";
import { categories, getCategory } from "@/lib/categories";
import { getTopicStats } from "@/lib/data";
import { getFeedPage } from "@/lib/data/feeds";
import { formatCount, storyCount } from "@/lib/utils";

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: PageProps<"/topics/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  return category
    ? { title: category.name, description: category.description }
    : { title: "Topic not found" };
}

export default function TopicPage({ params }: PageProps<"/topics/[slug]">) {
  return (
    <Suspense fallback={<TopicSkeleton />}>
      <Topic params={params} />
    </Suspense>
  );
}

function TopicSkeleton() {
  return (
    <>
      <PageHeader title={<Skeleton className="h-5 w-28" />} back="/topics" />
      <Skeleton className="h-48 w-full rounded-none sm:h-56" />
      <FeedSkeleton count={2} />
    </>
  );
}

async function Topic({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const feed = { kind: "topic", category: category.slug } as const;
  const [firstPage, stats] = await Promise.all([getFeedPage(feed, null), getTopicStats()]);
  const { stories, views } = stats[category.slug] ?? { stories: 0, views: 0 };
  const Icon = category.icon;

  return (
    <>
      <PageHeader title={category.name} subtitle={`${storyCount(stories)} today`} back="/topics" />

      <section className="relative">
        <Cover seed={`topic-${category.slug}`} category={category.slug} className="h-48 w-full sm:h-56" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-4 pb-4">
          <div className="min-w-0">
            <span className="mb-2 flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
              <Icon className="size-6 text-white" />
            </span>
            <h2 className="text-[31px] leading-9 font-extrabold tracking-tight">{category.name}</h2>
            <p className="line-clamp-2 text-[15px] text-foreground/80">{category.description}</p>
          </div>
          <TopicFollowButton slug={category.slug} />
        </div>
      </section>

      <div className="flex gap-5 border-b border-border px-4 py-3 text-[15px] text-muted">
        <span>
          <span className="font-bold text-foreground">{formatCount(stories)}</span>{" "}
          {stories === 1 ? "story" : "stories"} today
        </span>
        {views > 0 ? (
          <span>
            <span className="font-bold text-foreground">{formatCount(views)}</span> reads
          </span>
        ) : null}
      </div>

      <FeedList
        feed={feed}
        initial={firstPage}
        empty={
          <EmptyState
            icon={Newspaper}
            title="Quiet for now"
            description={`There are no ${category.name} stories yet. Follow the topic and we'll surface new ones in your feed.`}
          />
        }
      />
    </>
  );
}
