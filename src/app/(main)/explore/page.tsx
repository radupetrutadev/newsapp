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
import { getFeed, getSources, getTrends } from "@/lib/data";
import { formatCount } from "@/lib/utils";

export const metadata: Metadata = { title: "Explore" };

export default async function ExplorePage() {
  const [feed, trends, sources] = await Promise.all([getFeed(), getTrends(), getSources()]);
  const [top, ...rest] = [...feed].sort((a, b) => b.stats.views - a.stats.views);
  const carousel = rest.slice(0, 6);

  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-2 px-4 py-1.5">
          <SearchBox className="flex-1" />
          <Link href="/settings" aria-label="Settings" className={iconButton}>
            <Settings className="size-5" />
          </Link>
        </div>
      </PageHeader>

      {top ? (
        <Link href={`/article/${top.slug}`} className="group relative block">
          <ArticleMedia article={top} priority sizes="600px" className="aspect-[16/10] sm:aspect-video" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground/90">
              <LiveDot /> {categoryName(top.category)} · Most read today
            </p>
            <h2 className="mt-1 text-2xl leading-7 font-extrabold tracking-tight text-pretty group-hover:underline sm:text-[28px] sm:leading-8">
              {top.title}
            </h2>
            <p className="mt-2 flex items-center gap-2 text-[13px] text-foreground/80">
              <SourceAvatar source={top.source} size={20} /> {top.source.name} ·{" "}
              <TimeAgo iso={top.publishedAt} /> · {formatCount(top.stats.views)} reads
            </p>
          </div>
        </Link>
      ) : null}

      <section aria-labelledby="top-stories" className="border-b border-border py-3">
        <h2 id="top-stories" className="px-4 pb-3 text-xl font-extrabold">
          Top stories
        </h2>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
          {carousel.map((article) => (
            <Link
              key={article.id}
              href={`/article/${article.slug}`}
              className="group w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:bg-surface-hover"
            >
              <ArticleMedia article={article} sizes="220px" className="aspect-[16/10]" />
              <div className="p-3">
                <p className="text-[13px] text-muted">
                  {article.source.name} · <TimeAgo iso={article.publishedAt} />
                </p>
                <p className="mt-1 line-clamp-3 text-[15px] leading-5 font-bold group-hover:underline">
                  {article.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="trending" className="border-b border-border">
        <h2 id="trending" className="px-4 pt-3 pb-1 text-xl font-extrabold">
          Trending now
        </h2>
        <ol>
          {trends.map((trend, index) => (
            <li key={trend.id}>
              <Link
                href={`/search?q=${encodeURIComponent(trend.topic.replace(/^#/, ""))}`}
                className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <span className="w-5 pt-px text-[13px] font-medium text-muted tabular-nums">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-[13px] text-muted">{trend.context}</span>
                  <span className="block text-[15px] font-bold">{trend.topic}</span>
                  <span className="block text-[13px] text-muted">
                    {formatCount(trend.postsCount)} posts
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="browse" className="border-b border-border p-4">
        <div className="flex items-baseline justify-between pb-3">
          <h2 id="browse" className="text-xl font-extrabold">
            Browse topics
          </h2>
          <Link href="/topics" className="text-[15px] text-accent hover:underline">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.slug}
                href={`/topics/${category.slug}`}
                className="group relative h-24 overflow-hidden rounded-2xl ring-1 ring-white/10 transition-transform hover:scale-[1.02]"
              >
                <Cover seed={category.slug} category={category.slug} showIcon={false} className="absolute inset-0" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <Icon className="absolute top-3 right-3 size-5 text-white/90" />
                <span className="absolute bottom-3 left-3 text-[15px] font-bold">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section id="sources" aria-labelledby="sources-heading" className="scroll-mt-16 border-b border-border">
        <h2 id="sources-heading" className="px-4 pt-3 pb-1 text-xl font-extrabold">
          Sources to follow
        </h2>
        {sources.map((source) => (
          <SourceRow key={source.id} source={source} showBio />
        ))}
      </section>

      <section aria-labelledby="latest">
        <h2 id="latest" className="border-b border-border px-4 pt-6 pb-3 text-xl font-extrabold">
          Latest
        </h2>
        <ArticleList articles={feed.slice(0, 5)} />
      </section>
    </>
  );
}
