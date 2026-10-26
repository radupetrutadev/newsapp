"use server";

import { updateTag } from "next/cache";
import { isUuid } from "@/lib/activity";
import { COMMENT_MAX_LENGTH, isReportReason } from "@/lib/comments";
import { COMMENT_SELECT, mapComment, type CommentRow } from "@/lib/data/mappers";
import { getViewer } from "@/lib/data/viewer";
import { mockComments, mockUsers } from "@/lib/mock/community";
import { sendPushSoon } from "@/lib/push/send";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Comment } from "@/lib/types";

export type PostCommentResult =
  | { ok: true; comment: Comment; persisted: boolean }
  | { ok: false; error: string };

/** `persisted` is false in demo mode, where the page keeps the change itself. */
export type CommentActionResult = { ok: true; persisted: boolean } | { ok: false; error: string };

const INVALID = "That didn't work. Refresh and try again.";

/**
 * The database's spam limits and checks raise errors with codes like PT429
 * (which PostgREST also uses as the HTTP status) and messages written for
 * readers, so those are shown as they are.
 */
function failure(what: string, error: { code?: string; message: string }, fallback: string) {
  if (error.code && /^PT\d{3}$/.test(error.code)) return { ok: false as const, error: error.message };
  console.error(`Supabase: failed to ${what}: ${error.message}`);
  return { ok: false as const, error: fallback };
}

/** Posts a comment on a story, or a reply to another comment on it (`parentId`). */
export async function postComment(
  articleId: string,
  rawBody: string,
  parentId: string | null = null,
): Promise<PostCommentResult> {
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!body) return { ok: false, error: "Write something first." };
  if (body.length > COMMENT_MAX_LENGTH) return { ok: false, error: "Replies are limited to 280 characters." };
  if (parentId !== null && typeof parentId !== "string") return { ok: false, error: "That reply can't be sent." };

  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to join the conversation." };
  const author = {
    id: viewer.id,
    handle: viewer.handle,
    name: viewer.name,
    avatarUrl: viewer.avatarUrl,
    bio: viewer.bio,
    verified: viewer.verified,
  };

  // Demo mode: echo the reply back so the UI can show it, without storing it.
  // The page places it in its thread.
  if (!isSupabaseConfigured()) {
    const parent = mockComments.find((comment) => comment.id === parentId);
    return {
      ok: true,
      persisted: false,
      comment: {
        id: `local-${crypto.randomUUID()}`,
        articleId,
        author,
        body,
        likesCount: 0,
        parentId,
        replyToHandle: mockUsers.find((user) => user.id === parent?.authorId)?.handle ?? null,
        rootId: null,
        removed: null,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (!isUuid(articleId) || (parentId !== null && !isUuid(parentId))) {
    return { ok: false, error: "That reply can't be sent." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ article_id: articleId, user_id: viewer.id, body, parent_id: parentId })
    .select(COMMENT_SELECT)
    .single();
  if (error) return failure("post a comment", error, "Couldn't send your reply. Try again.");

  updateTag(`user-comments:${viewer.id}`);
  // Replies and @mentions notify people; their browsers hear about it now.
  sendPushSoon();
  return {
    ok: true,
    persisted: true,
    comment: mapComment(data as unknown as CommentRow, new Date().toISOString()),
  };
}

/**
 * Deletes one of the reader's own replies. One that others answered stays in
 * its thread as a placeholder.
 */
export async function deleteComment(commentId: string): Promise<CommentActionResult> {
  if (typeof commentId !== "string") return { ok: false, error: INVALID };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to delete replies." };

  // Demo mode: only replies posted on this page are the reader's.
  if (!isSupabaseConfigured()) {
    return commentId.startsWith("local-")
      ? { ok: true, persisted: false }
      : { ok: false, error: "You can only delete your own replies." };
  }
  if (!isUuid(commentId)) return { ok: false, error: INVALID };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_comment", { comment_id: commentId });
  if (error) return failure("delete a comment", error, "Couldn't delete your reply. Try again.");

  updateTag(`user-comments:${viewer.id}`);
  return { ok: true, persisted: true };
}

/** Reports someone else's reply. Reports from three readers hide it. */
export async function reportComment(commentId: string, reason: string): Promise<CommentActionResult> {
  if (typeof commentId !== "string" || !isReportReason(reason)) return { ok: false, error: INVALID };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to report replies." };

  if (!isSupabaseConfigured()) return { ok: true, persisted: false };
  if (!isUuid(commentId)) return { ok: false, error: INVALID };

  const supabase = await createClient();
  const { error } = await supabase
    .from("comment_reports")
    .insert({ comment_id: commentId, reporter_id: viewer.id, reason });
  // Reported already: nothing more to do.
  if (error && error.code !== "23505") {
    return failure("report a comment", error, "Couldn't send your report. Try again.");
  }
  return { ok: true, persisted: true };
}
