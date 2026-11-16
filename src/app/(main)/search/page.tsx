import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FeedList } from "@/components/feed/feed-list";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { SearchBox } from "@/components/layout/search-box";
import { SourceRow } from "@/components/source/source-row";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { getTrends, searchSources } from "@/lib/data";
import { getFeedPage } from "@/lib/data/feeds";
import { MAX_QUERY_LENGTH } from "@/lib/feeds";

export const metadata: Metadata = { title: "Search" };

type SearchParams = PageProps<"/search">["searchParams"];

async function readQuery(searchParams: SearchParams): Promise<string> {
  const { q } = await searchParams;
  return (Array.isArray(q) ? q[0] : q)?.trim().slice(0, MAX_QUERY_LENGTH) ?? "";
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-3 px-4 py-3 md:px-0">
          <BackButton fallbackHref="/explore" />
          <Suspense fallback={<SearchBox className="flex-1" />}>
            <QueryInput searchParams={searchParams} />
          </Suspense>
        </div>
      </PageHeader>

      <Suspense fallback={<FeedSkeleton count={3} />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function QueryInput({ searchParams }: { searchParams: SearchParams }) {
  const query = await readQuery(searchParams);
  return <SearchBox key={query} defaultValue={query} autoFocus={!query} className="flex-1" />;
}

async function Results({ searchParams }: { searchParams: SearchParams }) {
  const query = await readQuery(searchParams);

  if (!query) {
    const trends = await getTrends();
    return (
      <div className="px-4 py-6 md:px-0">
        <p className="kicker text-accent">Search</p>
        <h2 className="mt-2 font-display text-[28px] leading-8 font-semibold tracking-tight">Try searching for</h2>
        <p className="mt-1 text-[15px] text-muted">Stories, sources and topics across Pulse.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {trends.map((trend) => {
            const term = trend.topic.replace(/^#/, "");
            return (
              <Link
                key={trend.id}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-border bg-surface px-4 py-2 text-[14px] font-medium transition-colors hover:border-accent/40 hover:text-accent"
              >
                {trend.topic}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const feed = { kind: "search", query } as const;
  const [stories, sources] = await Promise.all([getFeedPage(feed, null), searchSources(query)]);

  if (stories.articles.length === 0 && sources.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={`No results for "${query}"`}
        description="Try a different spelling, a broader term, or browse topics from Explore."
      />
    );
  }

  return (
    <>
      {sources.length > 0 ? (
        <section aria-labelledby="source-results" className="pt-2">
          <h2 id="source-results" className="px-4 pb-3 font-display text-[22px] font-semibold tracking-tight md:px-0">
            Sources
          </h2>
          <div className="mx-4 rounded-2xl border border-border bg-surface p-1.5 md:mx-0">
            {sources.slice(0, 3).map((source) => (
              <SourceRow key={source.id} source={source} />
            ))}
          </div>
        </section>
      ) : null}
      {stories.articles.length > 0 ? (
        <section aria-labelledby="story-results" className="pt-6">
          <h2 id="story-results" className="px-4 pb-3 font-display text-[22px] font-semibold tracking-tight md:px-0">
            Stories
          </h2>
          <FeedList feed={feed} initial={stories} empty={null} />
        </section>
      ) : null}
    </>
  );
}
