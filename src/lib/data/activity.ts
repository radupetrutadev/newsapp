import { engagementLists, type AccountActivity, type ActivityItem, type EngagementList } from "@/lib/activity";
import { mapSettings } from "@/lib/settings";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Article, PublicProfile } from "@/lib/types";
import { ARTICLE_SELECT, mapArticle, mapPublicProfile, type ArticleRow, type ProfileRow } from "./mappers";
import { getViewer } from "./viewer";

/*
 * The signed-in reader's own activity. These read cookies, so render callers
 * inside <Suspense>. RLS limits every query to the reader's own rows.
 */

/** Most recent items loaded per list. */
const LIST_LIMIT = 500;
const ARTICLES_LIMIT = 200;

/** Everything the client store needs. Null in demo mode, where activity stays in the browser. */
export async function getAccountActivity(): Promise<AccountActivity | null> {
  if (!isSupabaseConfigured()) return null;

  const viewer = await getViewer();
  if (!viewer) return { status: "signed-out" };

  const supabase = await createClient();
  const recent = { ascending: false } as const;
  const [liked, reposted, bookmarked, following, topics, likedComments, people, settings, unread] =
    await Promise.all([
      supabase.from("likes").select("id:article_id, at:created_at").order("created_at", recent).limit(LIST_LIMIT),
      supabase.from("reposts").select("id:article_id, at:created_at").order("created_at", recent).limit(LIST_LIMIT),
      supabase.from("bookmarks").select("id:article_id, at:created_at").order("created_at", recent).limit(LIST_LIMIT),
      supabase.from("follows").select("id:source_id, at:created_at").order("created_at", recent).limit(LIST_LIMIT),
      supabase.from("topic_follows").select("id:category, at:created_at").order("created_at", recent),
      supabase
        .from("comment_likes")
        .select("id:comment_id, at:created_at")
        .order("created_at", recent)
        .limit(LIST_LIMIT),
      supabase
        .from("user_follows")
        .select("id:followee_id, at:created_at")
        .order("created_at", recent)
        .limit(LIST_LIMIT),
      supabase.from("user_settings").select("*").maybeSingle(),
      countUnread(supabase),
    ]);

  const results: Record<EngagementList, { data: ActivityItem[] | null; error: { message: string } | null }> = {
    liked,
    reposted,
    bookmarked,
    following,
    topics,
    likedComments,
    people,
  };
  const failed = [...engagementLists.map((list) => results[list].error), settings.error].find(Boolean);
  if (failed) {
    console.error(`Supabase: failed to load activity for ${viewer.id}: ${failed.message}`);
    return { status: "unavailable", userId: viewer.id };
  }

  return {
    status: "ready",
    userId: viewer.id,
    lists: {
      liked: liked.data ?? [],
      reposted: reposted.data ?? [],
      bookmarked: bookmarked.data ?? [],
      following: following.data ?? [],
      topics: topics.data ?? [],
      likedComments: likedComments.data ?? [],
      people: people.data ?? [],
    },
    settings: mapSettings(settings.data),
    unreadNotifications: unread,
  };
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** The reader's unread notifications; 0 when signed out (RLS shows no rows) or on error. */
export async function countUnread(supabase: ServerClient): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) {
    console.error(`Supabase: failed to count unread notifications: ${error.message}`);
    return 0;
  }
  return count ?? 0;
}

/**
 * People the reader follows, newest first, for the Following tab on their
 * profile. Null in demo mode, where follows stay in the browser.
 */
export async function getViewerPeople(): Promise<PublicProfile[] | null> {
  if (!isSupabaseConfigured()) return null;

  const viewer = await getViewer();
  if (!viewer) return [];

  const countedAt = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_follows")
    .select("profile:profiles!followee_id(*)")
    .order("created_at", { ascending: false })
    .limit(ARTICLES_LIMIT);
  if (error) {
    console.error(`Supabase: failed to load followed people: ${error.message}`);
    return [];
  }
  return (data as unknown as { profile: ProfileRow | null }[]).flatMap(({ profile }) =>
    profile ? [mapPublicProfile(profile, countedAt)] : [],
  );
}

const articleTables = { liked: "likes", reposted: "reposts", bookmarked: "bookmarks" } as const;

/**
 * Stories the reader liked, reposted or bookmarked, newest first, so those
 * pages also show stories that have dropped out of the feed. Null in demo mode.
 */
export async function getViewerArticles(
  list: keyof typeof articleTables,
): Promise<Article[] | null> {
  if (!isSupabaseConfigured()) return null;

  const viewer = await getViewer();
  if (!viewer) return [];

  const countedAt = new Date().toISOString();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(articleTables[list])
    .select(`article:articles(${ARTICLE_SELECT})`)
    .order("created_at", { ascending: false })
    .limit(ARTICLES_LIMIT);
  if (error) {
    console.error(`Supabase: failed to load ${list} stories: ${error.message}`);
    return [];
  }

  return (data as unknown as { article: ArticleRow | null }[]).flatMap(({ article }) =>
    article?.source ? [mapArticle(article, countedAt)] : [],
  );
}

/**
 * The comments on a story the reader has reported, which stay folded away
 * for them. Empty in demo mode, where reports stay in the page.
 */
export async function getViewerReports(articleId: string): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const viewer = await getViewer();
  if (!viewer) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comment_reports")
    .select("comment_id, comment:comments!inner(article_id)")
    .eq("comment.article_id", articleId)
    .limit(LIST_LIMIT);
  if (error) {
    console.error(`Supabase: failed to load reports: ${error.message}`);
    return [];
  }
  return data.map((report) => report.comment_id);
}
