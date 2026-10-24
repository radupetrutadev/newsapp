"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { ArticleList } from "@/components/feed/article-list";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { useEngagement, useEngagementStatus } from "@/lib/store/engagement";
import type { Article } from "@/lib/types";

export function BookmarksView({ articles }: { articles: Article[] }) {
  const status = useEngagementStatus();
  const { bookmarked } = useEngagement();
  const byId = new Map(articles.map((article) => [article.id, article]));
  // Most recently bookmarked first.
  const saved = bookmarked.flatMap((id) => byId.get(id) ?? []);

  if (status === "loading") return <FeedSkeleton count={3} />;

  if (status === "signed-out") {
    return (
      <EmptyState
        icon={Bookmark}
        title="Sign in to see your bookmarks"
        description="Bookmarks are saved to your account, so they're there on every device."
        action={
          <Link href="/login" className={buttonClasses({ variant: "accent", size: "lg" })}>
            Sign in
          </Link>
        }
      />
    );
  }

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
