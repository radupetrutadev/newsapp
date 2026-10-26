"use client";

import { startTransition, useSyncExternalStore } from "react";
import { clearBookmarks, setActivity } from "@/lib/actions/activity";
import {
  countAdjustment,
  engagementLists,
  type AccountActivity,
  type ActivityChange,
  type EngagementList,
} from "@/lib/activity";
import { defaultFollowedSourceIds, defaultFollowedTopics } from "@/lib/mock/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPersistentStore } from "./persistent-store";
import { toast } from "./toast";

export type { EngagementList };

/*
 * Likes, reposts, bookmarks and follows.
 * - Demo mode: saved in this browser.
 * - With Supabase: loaded from the reader's account by <ActivitySync> and
 *   saved with server actions. Changes show at once and are rolled back if
 *   saving fails. Signed-out readers are asked to sign in.
 */

type Lists = Record<EngagementList, string[]>;

/** "local": demo mode. "unavailable": signed in, but the account's activity failed to load. */
export type EngagementStatus = "local" | "loading" | "signed-out" | "unavailable" | "ready";

interface EngagementState {
  status: EngagementStatus;
  userId: string | null;
  /** Newest first. */
  lists: Lists;
  /** On/off changes per list and id, oldest first, used to correct cached counts. */
  changes: Partial<Record<EngagementList, Record<string, ActivityChange[]>>>;
}

const emptyLists: Lists = { liked: [], reposted: [], bookmarked: [], following: [], topics: [] };
const demoLists: Lists = {
  ...emptyLists,
  following: defaultFollowedSourceIds,
  topics: defaultFollowedTopics,
};

const demo = !isSupabaseConfigured();

// ---------------------------------------------------------------------------
// Demo mode: localStorage

const local = createPersistentStore<Lists>("pulse:engagement:v1", demoLists);
const localServerState: EngagementState = { status: "local", userId: null, lists: demoLists, changes: {} };
let localCache: { lists: Lists; state: EngagementState } | null = null;

function localSnapshot(): EngagementState {
  const lists = local.getSnapshot();
  if (localCache?.lists !== lists) {
    localCache = { lists, state: { status: "local", userId: null, lists, changes: {} } };
  }
  return localCache.state;
}

// ---------------------------------------------------------------------------
// Supabase: the signed-in reader's account

const loadingState: EngagementState = { status: "loading", userId: null, lists: emptyLists, changes: {} };
let account = loadingState;
const listeners = new Set<() => void>();

function setAccount(next: EngagementState) {
  account = next;
  listeners.forEach((listener) => listener());
}

function subscribeAccount(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const source = demo
  ? { subscribe: local.subscribe, getSnapshot: localSnapshot, getServerSnapshot: () => localServerState }
  : { subscribe: subscribeAccount, getSnapshot: () => account, getServerSnapshot: () => loadingState };

/** Called by <ActivityHydrator> with what the server loaded for this page view. */
export function hydrateEngagement(activity: AccountActivity) {
  if (demo) return;

  // Same reader as before (e.g. the page re-rendered): keep the changes made
  // in this tab, which are newer than the server's snapshot.
  const sameReader = "userId" in activity && activity.userId === account.userId;
  if (sameReader && account.status === "ready") return;

  if (activity.status === "ready") {
    const lists = { ...emptyLists };
    const changes: EngagementState["changes"] = {};
    for (const list of engagementLists) {
      lists[list] = activity.lists[list].map((item) => item.id);
      changes[list] = Object.fromEntries(
        activity.lists[list].map((item) => [item.id, [{ on: true, at: Date.parse(item.at) }]]),
      );
    }
    setAccount({ status: "ready", userId: activity.userId, lists, changes });
  } else if (activity.status === "unavailable") {
    setAccount({ ...loadingState, status: "unavailable", userId: activity.userId });
  } else if (account.status !== "signed-out") {
    setAccount({ ...loadingState, status: "signed-out" });
  }
}

const signInPrompts: Record<EngagementList, string> = {
  liked: "Sign in to like stories",
  reposted: "Sign in to repost stories",
  bookmarked: "Sign in to bookmark stories",
  following: "Sign in to follow sources",
  topics: "Sign in to follow topics",
};

/** Whether the account can be written to; explains why not with a toast. */
function canWrite(list: EngagementList): boolean {
  switch (account.status) {
    case "ready":
      return true;
    case "signed-out":
      toast(signInPrompts[list], { label: "Sign in", href: "/login" });
      return false;
    case "unavailable":
      toast("Your account didn't load. Refresh the page and try again.");
      return false;
    default:
      // Still loading; the button will work in a moment.
      return false;
  }
}

function withItem(ids: string[], id: string, on: boolean): string[] {
  const rest = ids.filter((item) => item !== id);
  return on ? [id, ...rest] : rest;
}

function updateChanges(
  list: EngagementList,
  id: string,
  update: (changes: ActivityChange[]) => ActivityChange[],
): EngagementState["changes"] {
  const forList = account.changes[list] ?? {};
  return { ...account.changes, [list]: { ...forList, [id]: update(forList[id] ?? []) } };
}

/**
 * Turns an item on or off. Returns false when nothing changed because the
 * reader is signed out or their account is still loading.
 */
export function toggleEngagement(list: EngagementList, id: string): boolean {
  if (demo) {
    local.setState((current) => ({
      ...current,
      [list]: withItem(current[list], id, !current[list].includes(id)),
    }));
    return true;
  }
  if (!canWrite(list)) return false;

  const userId = account.userId;
  const on = !account.lists[list].includes(id);
  const change: ActivityChange = { on, at: null };
  setAccount({
    ...account,
    lists: { ...account.lists, [list]: withItem(account.lists[list], id, on) },
    changes: updateChanges(list, id, (changes) => [...changes, change]),
  });

  startTransition(async () => {
    const result = await setActivity(list, id, on);
    if (account.userId !== userId) return;

    if (result.ok) {
      setAccount({
        ...account,
        changes: updateChanges(list, id, (changes) =>
          changes.map((item) => (item === change ? { on, at: result.at } : item)),
        ),
      });
      return;
    }

    // Undo, unless the reader has toggled it again since; that later save decides.
    const latest = account.changes[list]?.[id]?.at(-1) === change;
    setAccount({
      ...account,
      lists: latest ? { ...account.lists, [list]: withItem(account.lists[list], id, !on) } : account.lists,
      changes: updateChanges(list, id, (changes) => changes.filter((item) => item !== change)),
    });
    toast(result.error);
  });
  return true;
}

/** Removes every bookmark. Returns false when nothing changed. */
export function clearAllBookmarks(): boolean {
  if (demo) {
    local.setState((current) => ({ ...current, bookmarked: [] }));
    return true;
  }
  if (!canWrite("bookmarked")) return false;

  const { userId, lists } = account;
  setAccount({ ...account, lists: { ...lists, bookmarked: [] } });
  startTransition(async () => {
    const result = await clearBookmarks();
    if (result.ok || account.userId !== userId) return;
    const restored = [...account.lists.bookmarked, ...lists.bookmarked];
    setAccount({ ...account, lists: { ...account.lists, bookmarked: [...new Set(restored)] } });
    toast(result.error);
  });
  return true;
}

/** Demo mode only: restore the starting likes, bookmarks and follows. */
export function resetEngagement() {
  if (demo) local.setState(() => demoLists);
}

function useEngagementState(): EngagementState {
  return useSyncExternalStore(source.subscribe, source.getSnapshot, source.getServerSnapshot);
}

/** The current lists, for code outside React such as event handlers. */
export function getEngagement(): Lists {
  return source.getSnapshot().lists;
}

export function useEngagement(): Lists {
  return useEngagementState().lists;
}

export function useEngagementStatus(): EngagementStatus {
  return useEngagementState().status;
}

/** [isActive, toggle] for one item in one list. `toggle` returns false if nothing changed. */
export function useToggle(list: EngagementList, id: string): [boolean, () => boolean] {
  const { lists } = useEngagementState();
  return [lists[list].includes(id), () => toggleEngagement(list, id)];
}

/**
 * A like, repost or follower count from a cached page, corrected for the
 * reader's own changes since it was read (see `countAdjustment`).
 */
export function useAdjustedCount(
  list: "liked" | "reposted" | "following",
  id: string,
  count: number,
  countedAt: string | undefined,
): number {
  const { lists, changes } = useEngagementState();
  const on = lists[list].includes(id);
  return Math.max(0, count + countAdjustment(on, changes[list]?.[id], countedAt));
}
