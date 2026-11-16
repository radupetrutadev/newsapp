"use client";

import { Bookmark, Eye, Heart, MessageCircle, Repeat2, Share, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useAdjustedCount, useToggle } from "@/lib/store/engagement";
import { toast } from "@/lib/store/toast";
import type { Article } from "@/lib/types";
import { cn, formatCount } from "@/lib/utils";

type Tone = "accent" | "repost" | "like";

const activeText: Record<Tone, string> = {
  accent: "text-accent",
  repost: "text-repost",
  like: "text-like",
};

const activeBg: Record<Tone, string> = {
  accent: "bg-accent/10",
  repost: "bg-repost/10",
  like: "bg-like/10",
};

function ActionInner({
  icon: Icon,
  count,
  active,
  filled,
}: {
  icon: LucideIcon;
  count?: number;
  active?: boolean;
  filled?: boolean;
}) {
  return (
    <>
      <Icon
        key={active ? "on" : "off"}
        className={cn("size-[18px]", active && filled && "animate-pop fill-current")}
        strokeWidth={active ? 2.3 : 1.9}
      />
      {count ? <span className="text-[13px] font-medium tabular-nums">{formatCount(count)}</span> : null}
    </>
  );
}

const actionClass = (tone: Tone, active?: boolean, square?: boolean) =>
  cn(
    "relative flex h-9 items-center gap-1.5 rounded-full transition-colors",
    square ? "w-9 justify-center" : "min-w-9 justify-center px-2.5",
    active ? cn(activeText[tone], activeBg[tone]) : "text-muted hover:bg-white/[0.06] hover:text-foreground",
  );

export function ArticleActions({
  article,
  size = "default",
  className,
}: {
  article: Article;
  /** "detail" (the story page) leaves the counts out; they're shown above it. */
  size?: "default" | "detail";
  className?: string;
}) {
  const [liked, toggleLike] = useToggle("liked", article.id);
  const [reposted, toggleRepost] = useToggle("reposted", article.id);
  const [bookmarked, toggleBookmark] = useToggle("bookmarked", article.id);
  const likes = useAdjustedCount("liked", article.id, article.stats.likes, article.countedAt);
  const reposts = useAdjustedCount("reposted", article.id, article.stats.reposts, article.countedAt);
  const detail = size === "detail";

  async function share() {
    const url = `${window.location.origin}/article/${article.slug}`;
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: article.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast("Copied to clipboard");
    } catch {
      // Share sheet dismissed or clipboard blocked; nothing to do.
    }
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        aria-label={liked ? "Unlike" : "Like"}
        aria-pressed={liked}
        onClick={toggleLike}
        className={actionClass("like", liked)}
      >
        <ActionInner icon={Heart} count={detail ? undefined : likes} active={liked} filled />
      </button>
      <button
        type="button"
        aria-label={reposted ? "Undo repost" : "Repost"}
        aria-pressed={reposted}
        onClick={() => {
          if (toggleRepost() && !reposted) toast("Reposted to your followers");
        }}
        className={actionClass("repost", reposted)}
      >
        <ActionInner icon={Repeat2} count={detail ? undefined : reposts} active={reposted} />
      </button>
      <Link
        href={`/article/${article.slug}#replies`}
        aria-label={`${article.stats.comments} replies`}
        className={actionClass("accent")}
      >
        <ActionInner icon={MessageCircle} count={detail ? undefined : article.stats.comments} />
      </Link>

      <div className="ml-auto flex items-center gap-1">
        {detail || article.stats.views === 0 ? null : (
          <span
            className="mr-1.5 hidden items-center gap-1.5 text-[12px] text-muted tabular-nums min-[400px]:flex"
            title="Reads"
          >
            <Eye className="size-4" /> {formatCount(article.stats.views)}
          </span>
        )}
        <button
          type="button"
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          aria-pressed={bookmarked}
          onClick={() => {
            if (!toggleBookmark()) return;
            toast(bookmarked ? "Removed from your Bookmarks" : "Added to your Bookmarks");
          }}
          className={actionClass("accent", bookmarked, true)}
        >
          <ActionInner icon={Bookmark} active={bookmarked} filled />
        </button>
        <button type="button" aria-label="Share" onClick={share} className={actionClass("accent", false, true)}>
          <ActionInner icon={Share} />
        </button>
      </div>
    </div>
  );
}
