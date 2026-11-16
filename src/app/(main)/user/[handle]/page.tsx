import { CalendarDays, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { FollowButton } from "@/components/source/follow-button";
import { FollowerCount } from "@/components/source/follower-count";
import { ProfileHeader } from "@/components/source/profile-header";
import { ProfileSkeleton } from "@/components/source/profile-skeleton";
import { UserAvatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Cover } from "@/components/ui/cover";
import { EmptyState } from "@/components/ui/empty-state";
import { TimeAgo } from "@/components/ui/time-ago";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { getUserComments, getUserHandles, getUserProfile } from "@/lib/data";
import { getViewer } from "@/lib/data/viewer";
import type { PublicProfile, UserComment } from "@/lib/types";
import { formatMonthYear } from "@/lib/utils";

export function generateStaticParams() {
  return getUserHandles().map((handle) => ({ handle }));
}

export async function generateMetadata({ params }: PageProps<"/user/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getUserProfile(handle);
  if (!profile) return { title: "Profile not found" };
  return { title: `${profile.name} (@${profile.handle})`, description: profile.bio || undefined };
}

export default function UserPage({ params }: PageProps<"/user/[handle]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfilePage params={params} />
    </Suspense>
  );
}

async function UserProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getUserProfile(handle);
  if (!profile) notFound();

  const [comments, viewer] = await Promise.all([getUserComments(profile.id), getViewer()]);
  const own = viewer?.id === profile.id;

  return (
    <>
      <PageHeader
        back="/"
        title={
          <span className="flex items-center gap-1">
            <span className="truncate">{profile.name}</span>
            {profile.verified ? <VerifiedBadge /> : null}
          </span>
        }
        subtitle={`@${profile.handle}`}
      />

      <ProfileHeader
        banner={<Cover seed={profile.handle} category="tech" className="size-full" />}
        avatar={<UserAvatar user={profile} size={134} />}
        actions={
          own ? (
            <Link href="/profile/edit" className={buttonClasses({ variant: "outline" })}>
              Edit profile
            </Link>
          ) : (
            <FollowButton id={profile.id} list="people" name={profile.name} size="md" />
          )
        }
        name={profile.name}
        verified={profile.verified ? "person" : null}
        handle={profile.handle}
        bio={profile.bio || null}
        meta={[{ icon: CalendarDays, content: `Joined ${formatMonthYear(profile.joinedAt)}` }]}
        stats={[
          {
            key: "followers",
            label: <FollowerCount of={profile} list="people" noun />,
            value: <FollowerCount of={profile} list="people" />,
          },
        ]}
      />

      <h2 className="px-4 pt-8 pb-3 font-display text-[22px] font-semibold tracking-tight md:px-0">Replies</h2>
      {comments.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title={`@${profile.handle} hasn't replied to anything yet`}
          description="When they join the conversation on a story, their replies show up here."
        />
      ) : (
        <ul className="space-y-3 px-4 md:px-0">
          {comments.map((comment) => (
            <li key={comment.id}>
              <UserCommentItem comment={comment} profile={profile} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function UserCommentItem({ comment, profile }: { comment: UserComment; profile: PublicProfile }) {
  const href = comment.article ? `/article/${comment.article.slug}#comment-${comment.id}` : null;
  return (
    <article className="relative flex gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-hover">
      {href ? <Link href={href} className="absolute inset-0 rounded-2xl" aria-label="Open this reply" /> : null}
      <UserAvatar user={profile} size={40} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-[15px] leading-5">
          <span className="truncate font-semibold">{profile.name}</span>
          <span className="truncate text-[14px] text-muted">@{profile.handle}</span>
          <span className="text-muted">·</span>
          <TimeAgo iso={comment.createdAt} className="shrink-0 text-[13px] text-muted" />
        </div>
        {comment.replyToHandle ? (
          <p className="text-[15px] text-muted">
            Replying to <span className="text-accent">@{comment.replyToHandle}</span>
          </p>
        ) : null}
        <p className="mt-1 text-[15px] leading-[1.45] break-words whitespace-pre-wrap text-foreground/90">{comment.body}</p>
        {comment.article ? (
          <p className="mt-3 truncate rounded-lg bg-background/60 px-3 py-2 text-[13px] text-muted">
            On <span className="text-foreground/80">“{comment.article.title}”</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
