"use client";

import { CircleCheck, Settings, Users } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { iconButton, PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LogoMark } from "@/components/ui/logo";
import { Tabs } from "@/components/ui/tabs";
import { categoryName } from "@/lib/categories";
import { useEngagement } from "@/lib/store/engagement";
import { useSettings } from "@/lib/store/settings";
import type { Article } from "@/lib/types";
import { ArticleList } from "./article-list";
import { BreakingBanner } from "./breaking-banner";
import { CategoryChips, type CategoryFilter } from "./category-chips";

type FeedTab = "for-you" | "following";

const tabs: { id: FeedTab; label: string }[] = [
  { id: "for-you", label: "For you" },
  { id: "following", label: "Following" },
];

export function FeedView({
  articles,
  mobileAvatar,
}: {
  articles: Article[];
  /** Rendered top-left on mobile, where the sidebar is hidden. */
  mobileAvatar?: ReactNode;
}) {
  const [tab, setTab] = useState<FeedTab>("for-you");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const { following } = useEngagement();
  const { showBreakingBanner } = useSettings();

  const inTab =
    tab === "following"
      ? articles.filter((article) => following.includes(article.source.id))
      : articles;
  const visible =
    category === "all" ? inTab : inTab.filter((article) => article.category === category);
  const breaking =
    tab === "for-you" && category === "all" && showBreakingBanner
      ? articles.find((article) => article.isBreaking)
      : undefined;

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

      {breaking ? <BreakingBanner article={breaking} /> : null}

      {visible.length > 0 ? (
        <>
          <ArticleList articles={visible} />
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <CircleCheck className="size-8 text-accent" />
            <p className="text-[15px] font-bold">You&apos;re all caught up</p>
            <p className="text-[13px] text-muted">
              New stories land here the moment they&apos;re published.
            </p>
          </div>
        </>
      ) : tab === "following" && following.length === 0 ? (
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
            category === "all"
              ? "None of the sources you follow have published anything recently."
              : `No ${categoryName(category)} stories in this view right now. Try another topic or switch tabs.`
          }
        />
      )}
    </>
  );
}
