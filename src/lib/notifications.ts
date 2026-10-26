import type { AppNotification, NotificationActor, NotificationKind } from "@/lib/types";

/*
 * Notifications as the database returns them (public.notification_json) and
 * how the app words them. Shared by the notifications page, the push sender
 * and tests, so the list and a phone's lock screen say the same thing.
 */

export type NotificationFilter = "all" | "breaking" | "mentions";

export const notificationFilters: NotificationFilter[] = ["all", "breaking", "mentions"];

export function isNotificationFilter(value: unknown): value is NotificationFilter {
  return notificationFilters.includes(value as NotificationFilter);
}

/** Which kinds each tab shows. */
export function matchesFilter(filter: NotificationFilter, kind: NotificationKind): boolean {
  if (filter === "breaking") return kind === "breaking";
  if (filter === "mentions") return kind === "reply" || kind === "mention";
  return true;
}

/** One row of public.notification_json. */
export interface NotificationJson {
  id: string;
  kind: NotificationKind;
  created_at: string;
  updated_at: string;
  unread: boolean;
  actors_count: number;
  actors: { handle: string; display_name: string; avatar_url: string | null }[];
  comment: { id: string; body: string } | null;
  article: { slug: string; title: string } | null;
  source: { handle: string; name: string; color: string; logo_url: string | null } | null;
}

/** "Ava", "Ava and Ben", "Ava and 3 others". */
export function actorPhrase(names: string[], total: number): string {
  const [first = "Someone", second] = names;
  if (total <= 1) return first;
  if (total === 2 && second) return `${first} and ${second}`;
  const others = total - 1;
  return `${first} and ${others} ${others === 1 ? "other" : "others"}`;
}

function storyHref(row: NotificationJson): string {
  if (!row.article) return "/notifications";
  const anchor = row.comment ? `#comment-${row.comment.id}` : "";
  return `/article/${row.article.slug}${anchor}`;
}

/**
 * The words and link for one notification, or null when there is nothing
 * left to show (say the story was removed).
 */
export function toAppNotification(row: NotificationJson): AppNotification | null {
  const actors: NotificationActor[] = row.actors.map((actor) => ({
    type: "user",
    name: actor.display_name,
    handle: actor.handle,
    avatarUrl: actor.avatar_url,
  }));
  const who = actorPhrase(
    actors.map((actor) => actor.name),
    row.actors_count,
  );
  const base = {
    id: row.id,
    kind: row.kind,
    actors,
    actorsCount: row.actors_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    unread: row.unread,
  };

  switch (row.kind) {
    case "reply":
    case "mention":
      if (!row.comment || actors.length === 0) return null;
      return {
        ...base,
        text: row.kind === "reply" ? `${who} replied to you` : `${who} mentioned you`,
        preview: row.comment.body,
        href: storyHref(row),
      };
    case "like":
      if (!row.comment || row.actors_count === 0) return null;
      return { ...base, text: `${who} liked your reply`, preview: row.comment.body, href: storyHref(row) };
    case "follow":
      if (row.actors_count === 0) return null;
      return {
        ...base,
        text: `${who} followed you`,
        preview: null,
        // One follower: their page. Several: the reader's own profile.
        href: row.actors_count === 1 && actors[0] ? `/user/${actors[0].handle}` : "/profile",
      };
    case "breaking":
      if (!row.article || !row.source) return null;
      return {
        ...base,
        actors: [
          {
            type: "source",
            name: row.source.name,
            handle: row.source.handle,
            color: row.source.color,
            logoUrl: row.source.logo_url,
          },
        ],
        actorsCount: 1,
        text: `Breaking: ${row.article.title}`,
        preview: null,
        href: storyHref(row),
      };
    default:
      return null;
  }
}

/** What a push notification shows. `tag` makes a newer version replace an older one. */
export interface PushMessage {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const PUSH_BODY_LENGTH = 180;

export function toPushMessage(notification: AppNotification): PushMessage {
  const clip = (text: string) =>
    text.length > PUSH_BODY_LENGTH ? `${text.slice(0, PUSH_BODY_LENGTH - 1).trimEnd()}…` : text;

  if (notification.kind === "breaking") {
    return {
      title: `Breaking · ${notification.actors[0]?.name ?? "Pulse"}`,
      body: clip(notification.text.replace(/^Breaking: /, "")),
      url: notification.href,
      tag: notification.id,
    };
  }
  return {
    title: notification.text,
    body: clip(notification.preview ?? ""),
    url: notification.href,
    tag: notification.id,
  };
}
