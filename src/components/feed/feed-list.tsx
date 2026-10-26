"use client";

import { use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArticleSkeleton, FeedSkeleton } from "@/components/ui/skeleton";
import { feedParams, type FeedPage, type FeedSpec } from "@/lib/feeds";
import { getEngagement } from "@/lib/store/engagement";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Article } from "@/lib/types";
import { ArticleList } from "./article-list";

const demo = !isSupabaseConfigured();

/** Start loading the next page this far before the reader reaches the end. */
const PRELOAD_MARGIN = "1200px";

async function fetchPage(feed: FeedSpec, cursor: string | null): Promise<FeedPage> {
  const params = feedParams(feed);
  if (cursor) params.set("cursor", cursor);
  if (demo) {
    // Demo mode keeps follows in this browser, so the server needs to be told.
    const { following, topics } = getEngagement();
    params.set("sources", following.join(","));
    params.set("topics", topics.join(","));
  }
  const response = await fetch(`/api/feed?${params}`);
  if (!response.ok) throw new Error(`Couldn't load the feed: HTTP ${response.status}`);
  return response.json();
}

export interface FeedListProps {
  feed: FeedSpec;
  /** The first page, if the server rendered it; otherwise it's fetched. */
  initial: FeedPage | null;
  /** Shown when the feed has no stories at all. */
  empty: ReactNode;
  /** Shown after the last story. */
  end?: ReactNode;
}

interface State {
  articles: Article[];
  /** Cursor for the next page: undefined before the first page, null after the last. */
  next: string | null | undefined;
  loading: boolean;
  failed: boolean;
}

/**
 * Stories that keep loading as the reader scrolls. The feed is fixed for the
 * life of the list: give it a new `key` to show a different one.
 */
export function FeedList({ feed: initialFeed, initial, empty, end }: FeedListProps) {
  const [feed] = useState(initialFeed);
  const [state, setState] = useState<State>({
    articles: initial?.articles ?? [],
    next: initial ? initial.next : undefined,
    loading: false,
    failed: false,
  });
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const { articles, next, loading, failed } = state;

  const loadMore = useCallback(() => {
    if (busy.current || next === null) return;
    busy.current = true;
    setState((current) => ({ ...current, loading: true, failed: false }));
    fetchPage(feed, next ?? null).then(
      (page) => {
        busy.current = false;
        setState((current) => {
          // Ranked feeds can shift a little between pages; don't show a story twice.
          const seen = new Set(current.articles.map((article) => article.id));
          const added = page.articles.filter((article) => !seen.has(article.id));
          return { articles: [...current.articles, ...added], next: page.next, loading: false, failed: false };
        });
      },
      (error) => {
        busy.current = false;
        console.error(error);
        setState((current) => ({ ...current, loading: false, failed: true }));
      },
    );
  }, [feed, next]);

  // The first page, when the server didn't render it.
  useEffect(() => {
    if (next === undefined && !failed) loadMore();
  }, [next, failed, loadMore]);

  // The next page, once the end of the list comes near. Observing again after
  // each page also catches a short page that leaves the end in view.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !next || loading || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore();
      },
      { rootMargin: `0px 0px ${PRELOAD_MARGIN} 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [next, loading, failed, loadMore]);

  if (next === undefined && !failed) return <FeedSkeleton count={3} />;
  if (articles.length === 0 && next === null) return empty;

  return (
    <>
      {articles.length > 0 ? <ArticleList articles={articles} /> : null}
      {next === null ? (
        end
      ) : failed ? (
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <p className="text-[15px] text-muted">
            {articles.length > 0 ? "Couldn't load more stories." : "Couldn't load stories."}
          </p>
          <Button variant="outline" onClick={loadMore}>
            Try again
          </Button>
        </div>
      ) : (
        <div ref={sentinel} aria-busy={loading} aria-label="Loading more stories">
          <ArticleSkeleton />
        </div>
      )}
    </>
  );
}

/** A FeedList whose first page is still streaming from the server. Render inside <Suspense>. */
export function StreamedFeedList({
  initial,
  ...props
}: Omit<FeedListProps, "initial"> & { initial: Promise<FeedPage | null> }) {
  return <FeedList {...props} initial={use(initial)} />;
}
