"use client";

import { Newspaper } from "lucide-react";
import { useState } from "react";
import { FeedList } from "@/components/feed/feed-list";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import type { FeedPage } from "@/lib/feeds";

type SourceTab = "latest" | "top";

const tabs: { id: SourceTab; label: string }[] = [
  { id: "latest", label: "Latest" },
  { id: "top", label: "Top" },
];

/** A source's stories: Latest starts from the page the server rendered, Top loads when opened. */
export function SourceArticles({
  sourceId,
  latest,
  name,
}: {
  sourceId: string;
  latest: FeedPage;
  name: string;
}) {
  const [tab, setTab] = useState<SourceTab>("latest");

  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      <FeedList
        key={tab}
        feed={{ kind: "source", sourceId, order: tab }}
        initial={tab === "latest" ? latest : null}
        empty={
          <EmptyState
            icon={Newspaper}
            title="No stories yet"
            description={`When ${name} publishes, their stories will show up here.`}
          />
        }
      />
    </>
  );
}
