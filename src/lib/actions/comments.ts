"use server";

import { updateTag } from "next/cache";
import { getViewer } from "@/lib/data/viewer";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Comment } from "@/lib/types";

export type PostCommentResult =
  | { ok: true; comment: Comment; persisted: boolean }
  | { ok: false; error: string };

export async function postComment(articleId: string, rawBody: string): Promise<PostCommentResult> {
  const body = rawBody.trim();
  if (!body) return { ok: false, error: "Write something first." };
  if (body.length > 280) return { ok: false, error: "Replies are limited to 280 characters." };

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
    return {
      ok: true,
      persisted: false,
      comment: {
        id: `local-${crypto.randomUUID()}`,
        articleId,
        author,
        body,
        likesCount: 0,
        createdAt: new Date().toISOString(),
      },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ article_id: articleId, user_id: viewer.id, body })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  updateTag(`comments:${articleId}`);
  return {
    ok: true,
    persisted: true,
    comment: {
      id: data.id,
      articleId,
      author,
      body: data.body,
      likesCount: data.likes_count,
      createdAt: data.created_at,
    },
  };
}
