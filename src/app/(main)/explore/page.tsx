import { Settings } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArticleList } from "@/components/feed/article-list";
import { ArticleMedia } from "@/components/feed/article-media";
import { LiveDot } from "@/components/feed/breaking-banner";
import { iconButton, PageHeader } from "@/components/layout/page-header";
import { SearchBox } from "@/components/layout/search-box";
import { SourceRow } from "@/components/source/source-row";
import { SourceAvatar } from "@/components/ui/avatar";
import { Cover } from "@/components/ui/cover";
import { TimeAgo } from "@/components/ui/time-ago";
import { categories, categoryName } from "@/lib/categories";
import { getLatestArticles, getMostReadArticles, getSources, getTrends } from "@/lib/data";
import { formatCount, storyCount } from "@/lib/utils";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const [latest, mostRead, trends, sources] = await Promise.all([
    getLatestArticles(30),
    getMostReadArticles(7),
    getTrends(),
    getSources(),
  ]);
  // Rank by reads when they're tracked; otherwise lead with a fresh story that has a photo.
  const hasReads = mostRead.length > 0;
  const top = hasReads
    ? mostRead[0]
    : (latest.find((article) => article.isBreaking && article.imageUrl) ??
      latest.find((article) => article.imageUrl) ??
      latest[0]);
  const carousel = [...new Map([...mostRead, ...latest].map((article) => [article.id, article])).values()]
    .filter((article) => article.id !== top?.id)
    .slice(0, 6);
  const heroLabel = hasReads ? "Most read today" : top?.isBreaking ? "Breaking" : "Top story";

  return (
    <>
      <PageHeader className="md:hidden">
        <div className="flex items-center gap-2 px-4 py-2.5">
          <SearchBox className="flex-1" />
          <Link href="/settings" aria-label="Settings" className={iconButton}>
            <Settings className="size-5" />
          </Link>
        </div>
      </PageHeader>

      <div className="hidden pt-8 pb-5 md:block">
        <p className="kicker text-accent">Discover</p>
        <h1 className="mt-2 font-display text-[40px] leading-[1.05] font-bold tracking-[-0.035em]">Explore</h1>
      </div>

      {top ? (
        <div className="px-4 pt-2 md:px-0 md:pt-0">
          <Link
            href={`/article/${top.slug}`}
            className="group relative block overflow-hidden rounded-3xl border border-border"
          >
            <ArticleMedia article={top} priority sizes="(min-width: 768px) 720px, 100vw" className="aspect-[4/3] sm:aspect-[16/9]" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <p className="kicker flex items-center gap-2 text-foreground/90">
                <LiveDot /> {categoryName(top.category)} · {heroLabel}
              </p>
              <h2 className="mt-2 font-display text-[26px] leading-[1.1] font-bold tracking-[-0.025em] text-balance group-hover:text-accent sm:text-[34px]">
                {top.title}
              </h2>
              <p className="mt-3 flex items-center gap-2 text-[13px] text-foreground/75">
                <SourceAvatar source={top.source} size={20} /> {top.source.name} ·{" "}
                <TimeAgo iso={top.publishedAt} />
                {top.stats.views > 0 ? ` · ${formatCount(top.stats.views)} reads` : null}
              </p>
            </div>
          </Link>
        </div>
      ) : null}

      <section aria-labelledby="top-stories" className="pt-8">
        <SectionHeading id="top-stories">Top stories</SectionHeading>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 md:scroll-px-0 md:px-0">
          {carousel.map((article) => (
            <Link
              key={article.id}
              href={`/article/${article.slug}`}
              className="group w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-border-strong hover:bg-surface-hover"
            >
              <ArticleMedia article={article} sizes="240px" className="aspect-[16/10]" />
              <div className="p-3.5">
                <p className="kicker truncate text-muted">
                  {article.source.name} · <TimeAgo iso={article.publishedAt} />
                </p>
                <p className="mt-1.5 line-clamp-3 font-display text-[16px] leading-[1.25] font-semibold group-hover:text-accent">
                  {article.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="trending" className="pt-8">
        <SectionHeading id="trending">Trending now</SectionHeading>
        <ol className="mx-4 grid gap-x-2 rounded-2xl border border-border bg-surface p-2 sm:grid-cols-2 md:mx-0">
          {trends.map((trend, index) => (
            <li key={trend.id}>
              <Link
                href={`/search?q=${encodeURIComponent(trend.topic.replace(/^#/, ""))}`}
                className="group flex gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.04]"
              >
                <span className="font-display text-[22px] leading-6 font-bold text-accent tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] leading-6 font-semibold group-hover:text-accent">
                    {trend.topic}
                  </span>
                  <span className="block text-[12px] text-muted">
                    {trend.context} · {storyCount(trend.postsCount)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="browse" className="pt-8">
        <SectionHeading id="browse" more={{ href: "/topics", label: "See all" }}>
          Browse topics
        </SectionHeading>
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:px-0">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.slug}
                href={`/topics/${category.slug}`}
                className="group relative h-28 overflow-hidden rounded-2xl border border-border transition-transform hover:-translate-y-0.5"
              >
                <Cover seed={category.slug} category={category.slug} showIcon={false} className="absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
                <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg bg-background/40 backdrop-blur">
                  <Icon className="size-4 text-foreground" />
                </span>
                <span className="absolute bottom-3 left-3.5 font-display text-[17px] font-semibold">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="sources" aria-labelledby="sources-heading" className="scroll-mt-20 pt-8 md:scroll-mt-36">
        <SectionHeading id="sources-heading">Sources to follow</SectionHeading>
        <div className="mx-4 rounded-2xl border border-border bg-surface p-1.5 md:mx-0">
          {sources.map((source) => (
            <SourceRow key={source.id} source={source} showBio />
          ))}
        </div>
      </section>

      <section aria-labelledby="latest" className="pt-8">
        <SectionHeading id="latest">Latest</SectionHeading>
        <ArticleList articles={latest.slice(0, 5)} />
      </section>
    </>
  );
}

function SectionHeading({
  id,
  more,
  children,
}: {
  id: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between px-4 pb-3 md:px-0">
      <h2 id={id} className="font-display text-[24px] font-semibold tracking-tight">
        {children}
      </h2>
      {more ? (
        <Link href={more.href} className="text-[14px] font-medium text-muted transition-colors hover:text-accent">
          {more.label} →
        </Link>
      ) : null}
    </div>
  );
}
