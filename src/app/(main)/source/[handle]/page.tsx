import { BellPlus, CalendarDays, Ellipsis, Link2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { iconButton, PageHeader } from "@/components/layout/page-header";
import { FollowButton } from "@/components/source/follow-button";
import { ProfileHeader } from "@/components/source/profile-header";
import { ProfileSkeleton } from "@/components/source/profile-skeleton";
import { SourceArticles } from "@/components/source/source-articles";
import { SourceAvatar } from "@/components/ui/avatar";
import { Cover } from "@/components/ui/cover";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { getCategory } from "@/lib/categories";
import { getArticlesBySource, getSource, getSourceHandles } from "@/lib/data";
import { cn, formatCount, formatMonthYear, hostname } from "@/lib/utils";

export async function generateStaticParams() {
  return (await getSourceHandles()).map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: PageProps<"/source/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const source = await getSource(handle);
  if (!source) return { title: "Source not found" };
  return { title: `${source.name} (@${source.handle})`, description: source.description };
}

export default function SourcePage({ params }: PageProps<"/source/[handle]">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <SourceProfile params={params} />
    </Suspense>
  );
}

async function SourceProfile({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const source = await getSource(handle);
  if (!source) notFound();

  const articles = await getArticlesBySource(source.id);
  const category = getCategory(source.category);

  return (
    <>
      <PageHeader
        back="/"
        title={
          <span className="flex items-center gap-1">
            <span className="truncate">{source.name}</span>
            {source.verified ? <VerifiedBadge variant="gold" /> : null}
          </span>
        }
        subtitle={`${articles.length} ${articles.length === 1 ? "story" : "stories"}`}
      />

      <ProfileHeader
        banner={<Cover seed={source.handle} category={source.category} className="size-full" />}
        avatar={<SourceAvatar source={source} size={134} />}
        actions={
          <>
            <span className={cn(iconButton, "border border-[#536471]")} title="More">
              <Ellipsis className="size-5" />
            </span>
            <span className={cn(iconButton, "border border-[#536471]")} title="Notify me">
              <BellPlus className="size-5" />
            </span>
            <FollowButton sourceId={source.id} name={source.name} size="md" />
          </>
        }
        name={source.name}
        verified={source.verified ? "gold" : null}
        handle={source.handle}
        bio={source.description}
        meta={[
          ...(category
            ? [
                {
                  icon: category.icon,
                  content: (
                    <Link href={`/topics/${category.slug}`} className="hover:underline">
                      {category.name}
                    </Link>
                  ),
                },
              ]
            : []),
          ...(source.website
            ? [
                {
                  icon: Link2,
                  content: (
                    <a
                      href={source.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      {hostname(source.website)}
                    </a>
                  ),
                },
              ]
            : []),
          { icon: CalendarDays, content: `Joined ${formatMonthYear(source.joinedAt)}` },
        ]}
        stats={[{ label: "Followers", value: formatCount(source.followersCount) }]}
      />

      <SourceArticles articles={articles} name={source.name} />
    </>
  );
}
