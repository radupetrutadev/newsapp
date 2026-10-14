"use client";

import { defaultFollowedSourceIds, defaultFollowedTopics } from "@/lib/mock/community";
import { createPersistentStore } from "./persistent-store";

/*
 * Likes, reposts, bookmarks and follows live in localStorage for now.
 * The Supabase schema already has likes/bookmarks/follows tables for when
 * these move server-side.
 */

export type EngagementList = "liked" | "reposted" | "bookmarked" | "following" | "topics";

type EngagementState = Record<EngagementList, string[]>;

const defaults: EngagementState = {
  liked: [],
  reposted: [],
  bookmarked: [],
  following: defaultFollowedSourceIds,
  topics: defaultFollowedTopics,
};

const store = createPersistentStore<EngagementState>("pulse:engagement:v1", defaults);

export function toggleEngagement(list: EngagementList, id: string) {
  store.setState((current) => ({
    ...current,
    [list]: current[list].includes(id)
      ? current[list].filter((item) => item !== id)
      : [id, ...current[list]],
  }));
}

export function clearEngagement(list: EngagementList) {
  store.setState((current) => ({ ...current, [list]: [] }));
}

export function resetEngagement() {
  store.setState(() => defaults);
}

export function useEngagement(): EngagementState {
  return store.useStore();
}

/** [isActive, toggle] for one item in one list. */
export function useToggle(list: EngagementList, id: string): [boolean, () => void] {
  const state = store.useStore();
  return [state[list].includes(id), () => toggleEngagement(list, id)];
}
