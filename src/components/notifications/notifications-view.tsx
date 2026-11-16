"use client";

import { AtSign, BellOff, Heart, MessageCircle, UserPlus, Zap, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { SourceAvatar, UserAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { PagedListFooter, usePagedList, type Page } from "@/components/ui/paged-list";
import { ArticleSkeleton, FeedSkeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { TimeAgo } from "@/components/ui/time-ago";
import type { NotificationsPage } from "@/lib/data/notifications";
import type { NotificationFilter } from "@/lib/notifications";
import { markNotificationsSeen } from "@/lib/store/notifications";
import type { AppNotification, NotificationActor, NotificationKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const tabs: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "breaking", label: "Breaking" },
  { id: "mentions", label: "Mentions" },
];

const kinds: Record<NotificationKind, { icon: LucideIcon; className: string }> = {
  breaking: { icon: Zap, className: "bg-live/12 text-live [&>svg]:fill-live" },
  like: { icon: Heart, className: "bg-like/12 text-like [&>svg]:fill-like" },
  follow: { icon: UserPlus, className: "bg-accent/12 text-accent" },
  reply: { icon: MessageCircle, className: "bg-accent/12 text-accent" },
  mention: { icon: AtSign, className: "bg-accent/12 text-accent" },
};

async function fetchNotifications(filter: NotificationFilter, cursor: string | null): Promise<Page<AppNotification>> {
  const params = new URLSearchParams({ filter });
  if (cursor) params.set("cursor", cursor);
  const response = await fetch(`/api/notifications?${params}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Couldn't load notifications: HTTP ${response.status}`);
  const page = (await response.json()) as NotificationsPage;
  return { items: page.notifications, next: page.next };
}

/** The reader's notifications, with the first page of "All" from the server. */
export function NotificationsView({ initial }: { initial: NotificationsPage }) {
  const [filter, setFilter] = useState<NotificationFilter>("all");

  // Opening the page reads what it shows; anything newer stays unread.
  useEffect(() => {
    markNotificationsSeen(initial.newestAt ?? undefined);
  }, [initial]);

  return (
    <>
      <Tabs tabs={tabs} value={filter} onChange={setFilter} />
      <NotificationList
        key={filter}
        filter={filter}
        initial={filter === "all" ? { items: initial.notifications, next: initial.next } : null}
      />
    </>
  );
}

function NotificationList({
  filter,
  initial,
}: {
  filter: NotificationFilter;
  initial: Page<AppNotification> | null;
}) {
  const load = useCallback((cursor: string | null) => fetchNotifications(filter, cursor), [filter]);
  const list = usePagedList(load, initial);

  if (list.next === undefined && !list.failed) return <FeedSkeleton count={3} />;
  if (list.items.length === 0 && list.next === null) {
    return (
      <EmptyState
        icon={BellOff}
        title="Nothing to see here — yet"
        description={
          filter === "mentions"
            ? "When someone mentions you or replies to your comments, you'll find it here."
            : filter === "breaking"
              ? "Breaking alerts from the sources and topics you follow will show up here."
              : "Replies, likes, new followers and breaking news from the sources and topics you follow show up here."
        }
      />
    );
  }

  return (
    <>
      <ul className="space-y-2 px-4 md:px-0">
        {list.items.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </ul>
      <PagedListFooter
        list={list}
        noun="notifications"
        placeholder={
          <div className="px-4 pt-2 md:px-0">
            <ArticleSkeleton />
          </div>
        }
      />
    </>
  );
}

function ActorAvatar({ actor }: { actor: NotificationActor }) {
  return actor.type === "source" ? (
    <SourceAvatar source={actor} size={32} />
  ) : (
    <UserAvatar user={actor} size={32} />
  );
}

function NotificationItem({ notification }: { notification: AppNotification }) {
  const { icon: Icon, className } = kinds[notification.kind];
  const breaking = notification.kind === "breaking";

  return (
    <li>
      <Link
        href={notification.href}
        className={cn(
          "flex gap-3.5 rounded-2xl border p-4 transition-colors",
          notification.unread
            ? "border-accent/30 bg-accent/[0.05] hover:bg-accent/[0.08]"
            : "border-border bg-surface hover:border-border-strong hover:bg-surface-hover",
        )}
      >
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", className)}>
          <Icon className="size-5" strokeWidth={breaking ? 1.5 : 2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {notification.actors.slice(0, 6).map((actor) => (
              <ActorAvatar key={`${actor.type}:${actor.handle}`} actor={actor} />
            ))}
            <TimeAgo iso={notification.updatedAt} className="ml-auto self-start text-[13px] text-muted" />
          </div>
          <p className={cn("mt-2.5 text-[15px] leading-5", breaking && "font-display text-[16px] font-semibold")}>{notification.text}</p>
          {notification.preview ? (
            <p className="mt-1 line-clamp-2 text-[14px] leading-5 text-muted">{notification.preview}</p>
          ) : null}
        </div>
        {notification.unread ? (
          <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-accent" />
        ) : null}
      </Link>
    </li>
  );
}
