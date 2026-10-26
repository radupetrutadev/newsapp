import { CalendarDays, Info, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FollowingCount, ProfileTabs } from "@/components/profile/profile-tabs";
import { ProfileHeader } from "@/components/source/profile-header";
import { ProfileSkeleton } from "@/components/source/profile-skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Cover } from "@/components/ui/cover";
import { EmptyState } from "@/components/ui/empty-state";
import { getLatestArticles, getSources } from "@/lib/data";
import { getViewerArticles, getViewerPeople } from "@/lib/data/activity";
import { mockUsers } from "@/lib/mock/community";
import { getViewer } from "@/lib/data/viewer";
import type { Article, Source } from "@/lib/types";
import { formatCount, formatMonthYear } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const [articles, sources] = await Promise.all([getLatestArticles(100), getSources()]);

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <Profile articles={articles} sources={sources} />
    </Suspense>
  );
}

async function Profile({ articles, sources }: { articles: Article[]; sources: Source[] }) {
  const [viewer, liked, reposted, people] = await Promise.all([
    getViewer(),
    getViewerArticles("liked"),
    getViewerArticles("reposted"),
    getViewerPeople(),
  ]);

  if (!viewer) {
    return (
      <>
        <PageHeader title="Profile" back="/" />
        <EmptyState
          icon={UserRound}
          title="Sign in to see your profile"
          description="Your likes, reposts and the sources you follow live here."
          action={
            <Link href="/login" className={buttonClasses({ variant: "accent", size: "lg" })}>
              Sign in
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={viewer.name} subtitle={`@${viewer.handle}`} back="/" />
      <ProfileHeader
        banner={<Cover seed={viewer.handle} category="tech" className="size-full" />}
        avatar={<UserAvatar user={viewer} size={134} />}
        actions={
          <Link href="/settings" className={buttonClasses({ variant: "outline" })}>
            Edit profile
          </Link>
        }
        name={viewer.name}
        verified={viewer.verified ? "blue" : null}
        handle={viewer.handle}
        bio={viewer.bio || null}
        meta={[{ icon: CalendarDays, content: `Joined ${formatMonthYear(viewer.joinedAt)}` }]}
        stats={[
          { label: "Following", value: <FollowingCount /> },
          { label: viewer.followersCount === 1 ? "Follower" : "Followers", value: formatCount(viewer.followersCount) },
        ]}
      />
      {viewer.isDemo ? (
        <div className="mx-4 mb-4 flex gap-3 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4 text-[15px]">
          <Info className="mt-0.5 size-5 shrink-0 text-accent" />
          <p className="text-foreground/90">
            You&apos;re browsing as a demo reader. Likes, bookmarks and follows are saved in this
            browser. Add your Supabase keys to <code className="font-mono text-[13px]">.env.local</code>{" "}
            to enable real accounts.
          </p>
        </div>
      ) : null}
      {/* Liked and reposted stories from the account (null in demo mode) keep older ones listed. */}
      <ProfileTabs
        articles={[...(liked ?? []), ...(reposted ?? []), ...articles]}
        sources={sources}
        // Demo follows live in the browser, so any demo reader may be among them.
        people={people ?? mockUsers}
      />
    </>
  );
}
