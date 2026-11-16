"use client";

import { Heart, Repeat2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ArticleList } from "@/components/feed/article-list";
import { PersonRow } from "@/components/people/person-row";
import { SourceRow } from "@/components/source/source-row";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useEngagement, useEngagementStatus } from "@/lib/store/engagement";
import type { Article, Source, UserProfile } from "@/lib/types";

type ProfileTab = "likes" | "reposts" | "following";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "likes", label: "Likes" },
  { id: "reposts", label: "Reposts" },
  { id: "following", label: "Following" },
];

export function ProfileTabs({
  articles,
  sources,
  people,
}: {
  articles: Article[];
  sources: Source[];
  /** Readers who may be among those followed; the store says which are. */
  people: UserProfile[];
}) {
  const [tab, setTab] = useState<ProfileTab>("likes");
  const loading = useEngagementStatus() === "loading";
  const { liked, reposted, following, people: followedPeople } = useEngagement();
  const byId = new Map(articles.map((article) => [article.id, article]));
  const pick = (ids: string[]) => ids.flatMap((id) => byId.get(id) ?? []);
  const followedSources = sources.filter((source) => following.includes(source.id));
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const followed = followedPeople.flatMap((id) => peopleById.get(id) ?? []);

  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="pt-4" />
      {loading ? <FeedSkeleton count={2} /> : null}
      {!loading && tab === "likes" ? (
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
      {!loading && tab === "reposts" ? (
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
      {!loading && tab === "following" ? (
        followedSources.length + followed.length > 0 ? (
          <div className="mx-4 rounded-2xl border border-border bg-surface p-1.5 md:mx-0">
            {followedSources.length > 0 && followed.length > 0 ? <ListHeading>Sources</ListHeading> : null}
            {followedSources.map((source) => (
              <SourceRow key={source.id} source={source} showBio />
            ))}
            {followedSources.length > 0 && followed.length > 0 ? <ListHeading>People</ListHeading> : null}
            {followed.map((person) => (
              <PersonRow key={person.id} person={person} showBio />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Not following anyone yet"
            description="Follow publishers to fill your Following feed with their latest stories."
            action={
              <Link href="/explore#sources" className={buttonClasses({ variant: "primary", size: "lg" })}>
                Find sources
              </Link>
            }
          />
        )
      ) : null}
    </>
  );
}

function ListHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="kicker px-4 pt-3 pb-1 text-muted">{children}</h3>;
}

/** Sources and people the reader follows. */
export function FollowingCount() {
  const { following, people } = useEngagement();
  return <>{following.length + people.length}</>;
}
