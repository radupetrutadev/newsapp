"use client";

import { CircleCheck, Settings, Users } from "lucide-react";
import Link from "next/link";
import { Suspense, useState, type ReactNode } from "react";
import { iconButton, PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Logo } from "@/components/ui/logo";
import { FeedSkeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { categoryName } from "@/lib/categories";
import type { FeedPage } from "@/lib/feeds";
import { useEngagement } from "@/lib/store/engagement";
import { useNow } from "@/lib/store/now";
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

const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });

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
  /** Rendered top-left on phones, where the top bar is hidden. */
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
            <Link href="/explore#sources" className={buttonClasses({ variant: "primary", size: "lg" })}>
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
      <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <CircleCheck className="size-6" />
        </span>
        <p className="mt-2 font-display text-[19px] font-semibold tracking-tight">You&apos;re all caught up</p>
        <p className="text-[14px] text-muted">New stories land here the moment they&apos;re published.</p>
      </div>
    ),
  };
  const showFirstPage = tab === "for-you" && category === "all" && firstPage;

  return (
    <>
      <Masthead />

      <PageHeader>
        <div className="flex h-14 items-center justify-between px-4 md:hidden">
          <div className="w-10">{mobileAvatar}</div>
          <Link href="/" aria-label="Pulse home">
            <Logo />
          </Link>
          <Link href="/settings" aria-label="Settings" className={iconButton}>
            <Settings className="size-5" />
          </Link>
        </div>
        <Tabs tabs={tabs} value={tab} onChange={setTab} className="pt-1 md:pt-3" />
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

/** Today's date and the page title, above the feed on tablets and up. */
function Masthead() {
  // The page is prerendered, so the date is only filled in once it runs in the browser.
  const now = useNow();
  return (
    <div className="hidden pt-8 pb-2 md:block">
      <p className="kicker h-4 text-accent">{now ? today.format(now) : null}</p>
      <h1 className="mt-2 font-display text-[40px] leading-[1.05] font-bold tracking-[-0.035em]">
        Today&apos;s briefing
      </h1>
    </div>
  );
}
