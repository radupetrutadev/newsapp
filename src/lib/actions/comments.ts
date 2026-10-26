"use server";

import { updateTag } from "next/cache";
import { isUuid } from "@/lib/activity";
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

/** Posts a comment on a story, or a reply to another comment on it (`parentId`). */
export async function postComment(
  articleId: string,
  rawBody: string,
  parentId: string | null = null,
): Promise<PostCommentResult> {
  const body = typeof rawBody === "string" ? rawBody.trim() : "";
  if (!body) return { ok: false, error: "Write something first." };
  if (body.length > 280) return { ok: false, error: "Replies are limited to 280 characters." };
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
  if (error) {
    console.error(`Supabase: failed to post a comment: ${error.message}`);
    return { ok: false, error: "Couldn't send your reply. Try again." };
  }

  updateTag(`user-comments:${viewer.id}`);
  // Replies and @mentions notify people; their browsers hear about it now.
  sendPushSoon();
  return {
    ok: true,
    persisted: true,
    comment: mapComment(data as unknown as CommentRow, new Date().toISOString()),
  };
}
