"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { ArticleList } from "@/components/feed/article-list";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useEngagement } from "@/lib/store/engagement";
import type { Article } from "@/lib/types";

export function BookmarksView({ articles }: { articles: Article[] }) {
  const { bookmarked } = useEngagement();
  const byId = new Map(articles.map((article) => [article.id, article]));
  // Most recently bookmarked first.
  const saved = bookmarked.flatMap((id) => byId.get(id) ?? []);

  if (saved.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="Save stories for later"
        description="Bookmark stories to easily find them again in the future. Tap the bookmark icon on any story."
        action={
          <Link href="/" className={buttonClasses({ variant: "accent", size: "lg" })}>
            Browse the feed
          </Link>
        }
      />
    );
  }

  return <ArticleList articles={saved} />;
}

export function BookmarkCount() {
  const { bookmarked } = useEngagement();
  return <>{bookmarked.length === 1 ? "1 saved story" : `${bookmarked.length} saved stories`}</>;
}
