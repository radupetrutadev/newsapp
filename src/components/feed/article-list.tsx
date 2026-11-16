"use client";

import { useSettings } from "@/lib/store/settings";
import type { Article } from "@/lib/types";
import { ArticleCard } from "./article-card";

/** A list of article cards that respects the "Show images" setting. */
export function ArticleList({ articles }: { articles: Article[] }) {
  const { showImages } = useSettings();
  return (
    <div className="space-y-3 px-4 md:px-0">
      {articles.map((article) => (
        <ArticleCard key={article.id} article={article} showMedia={showImages} />
      ))}
    </div>
  );
}
