"use client";

import { CircleCheck, Settings, Users } from "lucide-react";
import Link from "next/link";
import { Suspense, useState, type ReactNode } from "react";
import { iconButton, PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LogoMark } from "@/components/ui/logo";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { categoryName } from "@/lib/categories";
import type { FeedPage } from "@/lib/feeds";
import { useEngagement } from "@/lib/store/engagement";
import { useSettings } from "@/lib/store/settings";
import type { Article } from "@/lib/types";
import { BreakingBanner } from "./breaking-banner";
import { CategoryChips, type CategoryFilter } from "./category-chips";
import { FeedList, StreamedFeedList, type FeedListProps } from "./feed-list";

type FeedTab = "for-you" | "following";

const tabs: { id: FeedTab; label: string }[] = [
  { id: "for-you", label: "For you" },
  { id: "following", label: "Following" },
];

export function FeedView({
  firstPage,
  breaking,
  mobileAvatar,
}: {
  /**
   * "For you" with every topic, streamed from the server. Null in demo mode,
   * where follows live in the browser and the list fetches it instead.
   */
  firstPage: Promise<FeedPage | null> | null;
  /** The newest breaking story, for the banner. */
  breaking: Article | null;
  /** Rendered top-left on mobile, where the sidebar is hidden. */
  mobileAvatar?: ReactNode;
}) {
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const { following } = useEngagement();
  const { showBreakingBanner } = useSettings();

  // Each tab and topic is its own feed; a new key starts it from the top.
  const key = `${tab}:${category}`;
  const list: Omit<FeedListProps, "initial"> = {
    feed: { kind: tab, category: category === "all" ? null : category },
    empty:
      tab === "following" && following.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Follow sources you trust"
          description="Stories from the publishers you follow show up here, newest first."
          action={
            <Link href="/explore#sources" className={buttonClasses({ variant: "accent", size: "lg" })}>
              Find sources
            </Link>
          }
        />
      ) : (
        <EmptyState
          title="Nothing here yet"
          description={
            category !== "all"
              ? `No ${categoryName(category)} stories in this view right now. Try another topic or switch tabs.`
              : tab === "following"
                ? "None of the sources you follow have published anything recently."
                : "New stories show up here as soon as they're published."
          }
        />
      ),
    end: (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <CircleCheck className="size-8 text-accent" />
        <p className="text-[15px] font-bold">You&apos;re all caught up</p>
        <p className="text-[13px] text-muted">
          New stories land here the moment they&apos;re published.
        </p>
      </div>
    ),
  };
  const showFirstPage = tab === "for-you" && category === "all" && firstPage;

  return (
    <>
      <PageHeader>
        <div className="flex h-[53px] items-center justify-between px-4 sm:hidden">
          <div className="w-9">{mobileAvatar}</div>
          <Link href="/" aria-label="Pulse home">
            <LogoMark className="size-7" />
          </Link>
          <Link href="/settings" aria-label="Settings" className={iconButton}>
            <Settings className="size-5" />
          </Link>
        </div>
        <Tabs tabs={tabs} value={tab} onChange={setTab} className="border-b-0" />
      </PageHeader>

      <CategoryChips value={category} onChange={setCategory} />

      {breaking && tab === "for-you" && category === "all" && showBreakingBanner ? (
        <BreakingBanner article={breaking} />
      ) : null}

      <Suspense fallback={<FeedSkeleton />}>
        {showFirstPage ? (
          <StreamedFeedList key={key} {...list} initial={showFirstPage} />
        ) : (
          <FeedList key={key} {...list} initial={null} />
        )}
      </Suspense>
    </>
  );
}
