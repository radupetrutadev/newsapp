"use client";

import { Heart, Repeat2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ArticleList } from "@/components/feed/article-list";
import { SourceRow } from "@/components/source/source-row";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { useEngagement } from "@/lib/store/engagement";
import type { Article, Source } from "@/lib/types";

type ProfileTab = "likes" | "reposts" | "following";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "likes", label: "Likes" },
  { id: "reposts", label: "Reposts" },
  { id: "following", label: "Following" },
];

export function ProfileTabs({ articles, sources }: { articles: Article[]; sources: Source[] }) {
  const [tab, setTab] = useState<ProfileTab>("likes");
  const { liked, reposted, following } = useEngagement();
  const byId = new Map(articles.map((article) => [article.id, article]));
  const pick = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? []);

  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === "likes" ? (
        liked.length > 0 ? (
          <ArticleList articles={pick(liked)} />
        ) : (
          <EmptyState
            icon={Heart}
            title="You don't have any likes yet"
            description="Tap the heart on any story to like it. When you do, it'll show up here."
          />
        )
      ) : null}
      {tab === "reposts" ? (
        reposted.length > 0 ? (
          <ArticleList articles={pick(reposted)} />
        ) : (
          <EmptyState
            icon={Repeat2}
            title="Share what you're reading"
            description="Stories you repost appear here and in your followers' feeds."
          />
        )
      ) : null}
      {tab === "following" ? (
        following.length > 0 ? (
          <div>
            {sources
              .filter((source) => following.includes(source.id))
              .map((source) => (
                <SourceRow key={source.id} source={source} showBio />
              ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Not following anyone yet"
            description="Follow publishers to fill your Following feed with their latest stories."
            action={
              <Link href="/explore#sources" className={buttonClasses({ variant: "accent", size: "lg" })}>
                Find sources
              </Link>
            }
          />
        )
      ) : null}
    </>
  );
}

export function FollowingCount() {
  const { following } = useEngagement();
  return <>{following.length}</>;
}
