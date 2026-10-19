"use client";

import {
  Bookmark,
  ChartNoAxesColumn,
  Heart,
  MessageCircle,
  Repeat2,
  Upload,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useToggle } from "@/lib/store/engagement";
import { toast } from "@/lib/store/toast";
import type { Article } from "@/lib/types";
import { cn, formatCount } from "@/lib/utils";

type Tone = "accent" | "repost" | "like";

const tones: Record<Tone, { text: string; bg: string }> = {
  accent: { text: "group-hover/action:text-accent", bg: "group-hover/action:bg-accent/10" },
  repost: { text: "group-hover/action:text-repost", bg: "group-hover/action:bg-repost/10" },
  like: { text: "group-hover/action:text-like", bg: "group-hover/action:bg-like/10" },
};

const activeText: Record<Tone, string> = {
  accent: "text-accent",
  repost: "text-repost",
  like: "text-like",
};

function ActionInner({
  icon: Icon,
  count,
  tone,
  active,
  filled,
}: {
  icon: LucideIcon;
  count?: number;
  tone: Tone;
  active?: boolean;
  filled?: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          "-m-2 flex size-[34px] items-center justify-center rounded-full transition-colors",
          tones[tone].bg,
        )}
      >
        <Icon
          key={active ? "on" : "off"}
          className={cn("size-[18px]", active && filled && "animate-pop fill-current")}
          strokeWidth={active ? 2.3 : 1.9}
        />
      </span>
      {count ? (
        <span className="min-w-[2ch] pl-1 text-[13px] tabular-nums">{formatCount(count)}</span>
      ) : null}
    </>
  );
}

const actionClass = (tone: Tone, active?: boolean) =>
  cn(
    "group/action relative flex items-center transition-colors",
    active ? activeText[tone] : cn("text-muted", tones[tone].text),
  );

export function ArticleActions({
  article,
  size = "default",
  className,
}: {
  article: Article;
  /** "detail" spreads the actions across the full width, like a tweet page. */
  size?: "default" | "detail";
  className?: string;
}) {
  const [liked, toggleLike] = useToggle("liked", article.id);
  const [reposted, toggleRepost] = useToggle("reposted", article.id);
  const [bookmarked, toggleBookmark] = useToggle("bookmarked", article.id);
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
    <div
      className={cn(
        "flex items-center justify-between",
        detail ? "px-1" : "max-w-[425px] sm:max-w-none",
        className,
      )}
    >
      <Link
        href={`/article/${article.slug}#replies`}
        aria-label={`${article.stats.comments} replies`}
        className={actionClass("accent")}
      >
        <ActionInner icon={MessageCircle} count={detail ? undefined : article.stats.comments} tone="accent" />
      </Link>
      <button
        type="button"
        aria-label={reposted ? "Undo repost" : "Repost"}
        aria-pressed={reposted}
        onClick={() => {
          toggleRepost();
          if (!reposted) toast("Reposted to your followers");
        }}
        className={actionClass("repost", reposted)}
      >
        <ActionInner
          icon={Repeat2}
          count={detail ? undefined : article.stats.reposts + (reposted ? 1 : 0)}
          tone="repost"
          active={reposted}
        />
      </button>
      <button
        type="button"
        aria-label={liked ? "Unlike" : "Like"}
        aria-pressed={liked}
        onClick={toggleLike}
        className={actionClass("like", liked)}
      >
        <ActionInner
          icon={Heart}
          count={detail ? undefined : article.stats.likes + (liked ? 1 : 0)}
          tone="like"
          active={liked}
          filled
        />
      </button>
      {detail ? null : (
        <span className={cn(actionClass("accent"), "hidden min-[400px]:flex")} title="Views">
          <ActionInner icon={ChartNoAxesColumn} count={article.stats.views} tone="accent" />
        </span>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          aria-pressed={bookmarked}
          onClick={() => {
            toggleBookmark();
            toast(bookmarked ? "Removed from your Bookmarks" : "Added to your Bookmarks");
          }}
          className={actionClass("accent", bookmarked)}
        >
          <ActionInner icon={Bookmark} tone="accent" active={bookmarked} filled />
        </button>
        <button type="button" aria-label="Share" onClick={share} className={actionClass("accent")}>
          <ActionInner icon={Upload} tone="accent" />
        </button>
      </div>
    </div>
  );
}
