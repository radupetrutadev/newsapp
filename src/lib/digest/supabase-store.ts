import "server-only";
import { ARTICLE_SELECT, mapArticle, type ArticleRow } from "@/lib/data/mappers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DigestStore } from "./run";

export function createSupabaseDigestStore(): DigestStore {
  const db = createAdminClient();

  return {
    async topStories(since, limit) {
      const { data, error } = await db
        .from("articles")
        .select(ARTICLE_SELECT)
        .gte("published_at", since)
        .order("views_count", { ascending: false })
        .order("likes_count", { ascending: false })
        .order("published_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`Failed to load the week's stories: ${error.message}`);
      const countedAt = new Date().toISOString();
      return (data as ArticleRow[]).map((row) => mapArticle(row, countedAt));
    },

    async claimRecipients(week, max) {
      const { data, error } = await db.rpc("claim_digest_recipients", { digest_week: week, max_count: max });
      if (error) throw new Error(`Failed to claim digest readers: ${error.message}`);
      return data.map((row) => ({ userId: row.user_id, email: row.email, name: row.display_name }));
    },

    async releaseRecipients(week, userIds) {
      const { error } = await db.from("email_digests").delete().eq("week", week).in("user_id", userIds);
      if (error) console.error(`Digest: failed to release claims: ${error.message}`);
    },
  };
}
