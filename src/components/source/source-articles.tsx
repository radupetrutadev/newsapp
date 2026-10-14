"use client";

import { Newspaper } from "lucide-react";
import { useState } from "react";
import { ArticleList } from "@/components/feed/article-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import type { Article } from "@/lib/types";

type SourceTab = "latest" | "top";

const tabs: { id: SourceTab; label: string }[] = [
  { id: "latest", label: "Latest" },
  { id: "top", label: "Top" },
];

export function SourceArticles({ articles, name }: { articles: Article[]; name: string }) {
  const [tab, setTab] = useState<SourceTab>("latest");
  const sorted =
    tab === "top" ? [...articles].sort((a, b) => b.stats.likes - a.stats.likes) : articles;

  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {sorted.length > 0 ? (
        <ArticleList articles={sorted} />
      ) : (
        <EmptyState
          icon={Newspaper}
          title="No stories yet"
          description={`When ${name} publishes, their stories will show up here.`}
        />
      )}
    </>
  );
}
