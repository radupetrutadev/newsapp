import type { Metadata } from "next";
import { BookmarkCount, BookmarksView } from "@/components/bookmarks/bookmarks-view";
import { ClearBookmarksButton } from "@/components/bookmarks/clear-bookmarks-button";
import { PageHeader } from "@/components/layout/page-header";
import { getFeed } from "@/lib/data";

export const metadata: Metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const articles = await getFeed();

  return (
    <>
      <PageHeader
        title="Bookmarks"
        subtitle={<BookmarkCount />}
        back="/"
        actions={<ClearBookmarksButton />}
      />
      <BookmarksView articles={articles} />
    </>
  );
}
