"use client";

import {
  AtSign,
  BellOff,
  Heart,
  MessageCircle,
  Repeat2,
  Sparkles,
  UserPlus,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { TimeAgo } from "@/components/ui/time-ago";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "breaking" | "mentions";

const tabs: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "breaking", label: "Breaking" },
  { id: "mentions", label: "Mentions" },
];

const kinds: Record<NotificationKind, { icon: LucideIcon; className: string }> = {
  breaking: { icon: Zap, className: "text-live fill-live" },
  like: { icon: Heart, className: "text-like fill-like" },
  repost: { icon: Repeat2, className: "text-repost" },
  follow: { icon: UserPlus, className: "text-accent fill-accent" },
  reply: { icon: MessageCircle, className: "text-accent" },
  mention: { icon: AtSign, className: "text-accent" },
  digest: { icon: Sparkles, className: "text-[#a78bfa] fill-[#a78bfa]" },
};

function matches(filter: Filter, kind: NotificationKind) {
  if (filter === "breaking") return kind === "breaking";
  if (filter === "mentions") return kind === "mention" || kind === "reply";
  return true;
}

export function NotificationsView({ notifications }: { notifications: AppNotification[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = notifications.filter((notification) => matches(filter, notification.kind));

  return (
    <>
      <Tabs tabs={tabs} value={filter} onChange={setFilter} />
      {visible.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="Nothing to see here — yet"
          description={
            filter === "mentions"
              ? "When someone mentions you or replies to your comments, you'll find it here."
              : "Breaking alerts from the sources and topics you follow will show up here."
          }
        />
      ) : (
        <ul>
          {visible.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </ul>
      )}
    </>
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
          "flex gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-white/[0.03]",
          notification.unread && "bg-accent/[0.04]",
        )}
      >
        <div className="flex w-10 shrink-0 justify-end pt-0.5">
          <Icon className={cn("size-7", className)} strokeWidth={breaking ? 1.5 : 2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {notification.actors.slice(0, 6).map((actor) => (
              <Avatar
                key={actor.handle}
                name={actor.name}
                size={32}
                shape={notification.kind === "breaking" || notification.kind === "digest" ? "square" : "circle"}
                colors={[actor.color, "#0f1419"]}
              />
            ))}
            <TimeAgo iso={notification.createdAt} className="ml-auto self-start text-[13px] text-muted" />
          </div>
          <p className={cn("mt-2 text-[15px] leading-5", breaking && "font-bold")}>
            {notification.text}
          </p>
          {notification.preview ? (
            <p className="mt-1 line-clamp-2 text-[15px] leading-5 text-muted">
              {notification.preview}
            </p>
          ) : null}
        </div>
        {notification.unread ? (
          <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-accent" />
        ) : null}
      </Link>
    </li>
  );
}
