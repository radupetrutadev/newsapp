import type { Metadata } from "next";
import { Suspense } from "react";
import { BookmarkCount, BookmarksView } from "@/components/bookmarks/bookmarks-view";
import { ClearBookmarksButton } from "@/components/bookmarks/clear-bookmarks-button";
import { PageHeader } from "@/components/layout/page-header";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { getFeed } from "@/lib/data";
import { getViewerArticles } from "@/lib/data/activity";
import type { Article } from "@/lib/types";

export const metadata: Metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const feed = await getFeed();

  return (
    <>
      <PageHeader
        title="Bookmarks"
        subtitle={<BookmarkCount />}
        back="/"
        actions={<ClearBookmarksButton />}
      />
      <Suspense fallback={<FeedSkeleton count={3} />}>
        <SavedStories feed={feed} />
      </Suspense>
    </>
  );
}

async function SavedStories({ feed }: { feed: Article[] }) {
  // Null in demo mode, where bookmarks point at stories in the feed.
  const saved = await getViewerArticles("bookmarked");
  // The feed also covers stories bookmarked moments ago, before the save finished.
  return <BookmarksView articles={saved ? [...saved, ...feed] : feed} />;
}
