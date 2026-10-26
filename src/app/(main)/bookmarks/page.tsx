import type { Metadata } from "next";
import { Suspense } from "react";
import { BookmarkCount, BookmarksView } from "@/components/bookmarks/bookmarks-view";
import { ClearBookmarksButton } from "@/components/bookmarks/clear-bookmarks-button";
import { PageHeader } from "@/components/layout/page-header";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { getLatestArticles } from "@/lib/data";
import { getViewerArticles } from "@/lib/data/activity";
import type { Article } from "@/lib/types";

export const metadata: Metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const latest = await getLatestArticles(100);

  return (
    <>
      <PageHeader
        title="Bookmarks"
        subtitle={<BookmarkCount />}
        back="/"
        actions={<ClearBookmarksButton />}
      />
      <Suspense fallback={<FeedSkeleton count={3} />}>
        <SavedStories latest={latest} />
      </Suspense>
    </>
  );
}

async function SavedStories({ latest }: { latest: Article[] }) {
  // Null in demo mode, where bookmarks point at the mock stories.
  const saved = await getViewerArticles("bookmarked");
  // The newest stories also cover ones bookmarked moments ago, before the save finished.
  return <BookmarksView articles={saved ? [...saved, ...latest] : latest} />;
}
