import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArticleList } from "@/components/feed/article-list";
import { BackButton } from "@/components/layout/back-button";
import { PageHeader } from "@/components/layout/page-header";
import { SearchBox } from "@/components/layout/search-box";
import { SourceRow } from "@/components/source/source-row";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { getTrends, search } from "@/lib/data";

export const metadata: Metadata = { title: "Search" };

type SearchParams = PageProps<"/search">["searchParams"];

async function readQuery(searchParams: SearchParams): Promise<string> {
  const { q } = await searchParams;
  return (Array.isArray(q) ? q[0] : q)?.trim() ?? "";
}

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <PageHeader>
        <div className="flex items-center gap-4 px-4 py-1.5">
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
      <div className="px-4 py-6">
        <h2 className="text-xl font-extrabold">Try searching for</h2>
        <p className="mt-1 text-[15px] text-muted">Stories, sources and topics across Pulse.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {trends.map((trend) => {
            const term = trend.topic.replace(/^#/, "");
            return (
              <Link
                key={trend.id}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-full border border-border px-4 py-1.5 text-[15px] font-medium transition-colors hover:bg-white/10"
              >
                {trend.topic}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  const { articles, sources } = await search(query);

  if (articles.length === 0 && sources.length === 0) {
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
        <section aria-labelledby="source-results" className="border-b border-border">
          <h2 id="source-results" className="px-4 pt-3 pb-1 text-xl font-extrabold">
            Sources
          </h2>
          {sources.slice(0, 3).map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </section>
      ) : null}
      {articles.length > 0 ? (
        <section aria-labelledby="story-results">
          <h2 id="story-results" className="border-b border-border px-4 pt-3 pb-3 text-xl font-extrabold">
            Stories <span className="text-[15px] font-normal text-muted">· {articles.length}</span>
          </h2>
          <ArticleList articles={articles} />
        </section>
      ) : null}
    </>
  );
}
