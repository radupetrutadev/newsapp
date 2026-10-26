"use server";

import { isUuid, type EngagementList } from "@/lib/activity";
import { getCategory } from "@/lib/categories";
import { sendPushSoon } from "@/lib/push/send";
import { settingsColumns, type Settings } from "@/lib/settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient, createPublicClient } from "@/lib/supabase/server";

/** `at` is server time (ms) after the write, used to correct cached counts. */
export type ActivityResult = { ok: true; at: number } | { ok: false; error: string };

const SIGNED_OUT: ActivityResult = { ok: false, error: "Sign in to save your activity." };
const INVALID: ActivityResult = { ok: false, error: "That didn't work. Refresh and try again." };
const FAILED: ActivityResult = { ok: false, error: "Couldn't save that. Try again." };

async function signedInClient() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}

function done(error: { message: string } | null, what: string): ActivityResult {
  if (!error) return { ok: true, at: Date.now() };
  console.error(`Supabase: failed to save ${what}: ${error.message}`);
  return FAILED;
}

/** Likes on comments and new followers notify someone; push them now. */
function notified(result: ActivityResult, on: boolean): ActivityResult {
  if (result.ok && on) sendPushSoon();
  return result;
}

const articleTables = { liked: "likes", reposted: "reposts", bookmarked: "bookmarks" } as const;

/** Turns one like, repost, bookmark or follow (of a source, topic or person) on or off for the signed-in reader. */
export async function setActivity(
  list: EngagementList,
  id: string,
  on: boolean,
): Promise<ActivityResult> {
  if (typeof on !== "boolean") return INVALID;
  const account = await signedInClient();
  if (!account) return SIGNED_OUT;
  const { supabase, userId } = account;

  switch (list) {
    case "liked":
    case "reposted":
    case "bookmarked": {
      if (!isUuid(id)) return INVALID;
      const table = articleTables[list];
      const { error } = on
        ? await supabase
            .from(table)
            .upsert({ user_id: userId, article_id: id }, { onConflict: "user_id,article_id", ignoreDuplicates: true })
        : await supabase.from(table).delete().eq("user_id", userId).eq("article_id", id);
      return done(error, list);
    }
    case "following": {
      if (!isUuid(id)) return INVALID;
      const { error } = on
        ? await supabase
            .from("follows")
            .upsert({ user_id: userId, source_id: id }, { onConflict: "user_id,source_id", ignoreDuplicates: true })
        : await supabase.from("follows").delete().eq("user_id", userId).eq("source_id", id);
      return done(error, list);
    }
    case "topics": {
      if (!getCategory(id)) return INVALID;
      const { error } = on
        ? await supabase
            .from("topic_follows")
            .upsert({ user_id: userId, category: id }, { onConflict: "user_id,category", ignoreDuplicates: true })
        : await supabase.from("topic_follows").delete().eq("user_id", userId).eq("category", id);
      return done(error, list);
    }
    case "likedComments": {
      if (!isUuid(id)) return INVALID;
      const { error } = on
        ? await supabase
            .from("comment_likes")
            .upsert({ user_id: userId, comment_id: id }, { onConflict: "user_id,comment_id", ignoreDuplicates: true })
        : await supabase.from("comment_likes").delete().eq("user_id", userId).eq("comment_id", id);
      return notified(done(error, list), on);
    }
    case "people": {
      if (!isUuid(id) || id === userId) return INVALID;
      const { error } = on
        ? await supabase
            .from("user_follows")
            .upsert(
              { follower_id: userId, followee_id: id },
              { onConflict: "follower_id,followee_id", ignoreDuplicates: true },
            )
        : await supabase.from("user_follows").delete().eq("follower_id", userId).eq("followee_id", id);
      return notified(done(error, list), on);
    }
    default:
      return INVALID;
  }
}

export async function clearBookmarks(): Promise<ActivityResult> {
  const account = await signedInClient();
  if (!account) return SIGNED_OUT;
  const { error } = await account.supabase.from("bookmarks").delete().eq("user_id", account.userId);
  return done(error, "bookmarks");
}

/** Saves changed settings; settings left out keep their saved (or default) value. */
export async function saveSettings(changes: Partial<Settings>): Promise<ActivityResult> {
  const account = await signedInClient();
  if (!account) return SIGNED_OUT;

  const row: Database["public"]["Tables"]["user_settings"]["Insert"] = {
    user_id: account.userId,
    updated_at: new Date().toISOString(),
  };
  for (const [key, value] of Object.entries(changes ?? {})) {
    if (!Object.hasOwn(settingsColumns, key) || typeof value !== "boolean") return INVALID;
    row[settingsColumns[key as keyof Settings]] = value;
  }

  const { error } = await account.supabase.from("user_settings").upsert(row, { onConflict: "user_id" });
  return done(error, "settings");
}

/** Counts a story view. Signed-out readers count too. */
export async function recordView(articleId: string): Promise<void> {
  if (!isSupabaseConfigured() || !isUuid(articleId)) return;
  const { error } = await createPublicClient().rpc("record_article_view", { article_id: articleId });
  if (error) console.error(`Supabase: failed to record a view: ${error.message}`);
}
