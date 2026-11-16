"use client";

import { ArrowUp } from "lucide-react";
import { use, useCallback, useEffect, useState, type ReactNode } from "react";
import { PagedListFooter, usePagedList, type Page } from "@/components/ui/paged-list";
import { ArticleSkeleton, FeedSkeleton } from "@/components/ui/skeleton";
import { feedParams, isLiveFeed, newestPublishedAt, type FeedPage, type FeedSpec } from "@/lib/feeds";
import { getEngagement } from "@/lib/store/engagement";
import { readHistory } from "@/lib/store/history";
import { getSettings } from "@/lib/store/settings";
import { toast } from "@/lib/store/toast";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Article } from "@/lib/types";
import { formatCount } from "@/lib/utils";
import { ArticleList } from "./article-list";

const demo = !isSupabaseConfigured();

/** How often an open feed asks whether newer stories are out. */
const NEW_STORIES_POLL_MS = 60_000;

function feedQuery(feed: FeedSpec): URLSearchParams {
  const params = feedParams(feed);
  if (demo) {
    // Demo mode keeps follows and reading history in this browser, so the server needs to be told.
    const { following, topics } = getEngagement();
    params.set("sources", following.join(","));
    params.set("topics", topics.join(","));
    if (feed.kind === "for-you" && getSettings().personalizeFeed) params.set("read", readHistory().join(","));
  }
  return params;
}

/** `fresh` skips the server's cache, for the first page after new stories came in. */
async function fetchPage(feed: FeedSpec, cursor: string | null, fresh = false): Promise<Page<Article>> {
  const params = feedQuery(feed);
  if (cursor) params.set("cursor", cursor);
  if (fresh) params.set("fresh", "1");
  const response = await fetch(`/api/feed?${params}`);
  if (!response.ok) throw new Error(`Couldn't load the feed: HTTP ${response.status}`);
  const page = (await response.json()) as FeedPage;
  return { items: page.articles, next: page.next };
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

/**
 * Stories that keep loading as the reader scrolls, with a "new stories"
 * button when newer ones are published (see isLiveFeed). The feed is fixed
 * for the life of the list: give it a new `key` to show a different one.
 */
export function FeedList({ feed: initialFeed, initial, empty, end }: FeedListProps) {
  const [feed] = useState(initialFeed);
  const load = useCallback((cursor: string | null) => fetchPage(feed, cursor), [feed]);
  const list = usePagedList(load, initial && { items: initial.articles, next: initial.next });
  const since = isLiveFeed(feed) && !demo ? newestPublishedAt(list.items) : null;
  const newStories = useNewStoryCount(feed, since);

  if (list.next === undefined && !list.failed) return <FeedSkeleton count={3} />;
  if (list.items.length === 0 && list.next === null) return empty;

  return (
    <div>
      {list.items.length > 0 ? <ArticleList articles={list.items} /> : null}
      {newStories > 0 ? (
        <NewStoriesButton
          count={newStories}
          onClick={async () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
            const loaded = await list.reload(() => fetchPage(feed, null, true));
            if (!loaded) toast("Couldn't load the new stories. Try again.");
          }}
        />
      ) : null}
      <PagedListFooter
        list={list}
        noun="stories"
        placeholder={
          <div className="px-4 pt-3 md:px-0">
            <ArticleSkeleton />
          </div>
        }
        end={end}
      />
    </div>
  );
}

/** A FeedList whose first page is still streaming from the server. Render inside <Suspense>. */
export function StreamedFeedList({
  initial,
  ...props
}: Omit<FeedListProps, "initial"> & { initial: Promise<FeedPage | null> }) {
  return <FeedList {...props} initial={use(initial)} />;
}

/**
 * How many stories in the feed were published after `since`, checked every
 * minute while the tab is visible and as soon as it's shown again.
 */
function useNewStoryCount(feed: FeedSpec, since: string | null): number {
  const [found, setFound] = useState<{ since: string; count: number } | null>(null);

  useEffect(() => {
    if (!since) return;
    let cancelled = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const params = feedQuery(feed);
      params.set("since", since);
      try {
        const response = await fetch(`/api/feed/new?${params}`, { cache: "no-store" });
        if (!response.ok) return;
        const { count } = (await response.json()) as { count: number };
        if (!cancelled) setFound({ since, count });
      } catch {
        // Offline; the next check will try again.
      }
    };
    const timer = window.setInterval(check, NEW_STORIES_POLL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [feed, since]);

  // A count from before the list was reloaded no longer applies.
  return found && found.since === since ? found.count : 0;
}

/** Floats at the bottom of the screen while the feed is in view. */
function NewStoriesButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <div className="pointer-events-none sticky bottom-[calc(96px+env(safe-area-inset-bottom))] z-20 flex h-0 items-start justify-center md:bottom-6">
      <button
        type="button"
        onClick={onClick}
        className="animate-fade-in pointer-events-auto flex -translate-y-full items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[14px] font-semibold text-on-accent shadow-[0_10px_30px_-6px_rgb(255_106_26/0.6)] transition-colors hover:bg-accent-hover"
      >
        <ArrowUp className="size-4" strokeWidth={2.5} />
        {count === 1 ? "1 new story" : `${formatCount(count)} new stories`}
      </button>
    </div>
  );
}
