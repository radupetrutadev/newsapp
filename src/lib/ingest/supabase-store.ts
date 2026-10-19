import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { CategorySlug } from "@/lib/types";
import type { ArticleInsert, IngestStore } from "./types";

const UNIQUE_VIOLATION = "23505";

export function createSupabaseIngestStore(): IngestStore {
  const db = createAdminClient();

  async function insert(rows: ArticleInsert[]) {
    // ON CONFLICT (url) DO NOTHING: only new stories come back.
    return db
      .from("articles")
      .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
      .select("id");
  }

  return {
    async listFeeds() {
      const { data, error } = await db
        .from("feeds")
        .select("id, url, source_id, category, etag, last_modified")
        .eq("active", true);
      if (error) throw new Error(`Failed to load feeds: ${error.message}`);
      return data.map((feed) => ({
        id: feed.id,
        url: feed.url,
        sourceId: feed.source_id,
        category: feed.category as CategorySlug,
        etag: feed.etag,
        lastModified: feed.last_modified,
      }));
    },

    async insertArticles(rows) {
      if (rows.length === 0) return 0;
      const { data, error } = await insert(rows);
      if (!error) return data.length;
      if (error.code !== UNIQUE_VIOLATION) throw new Error(error.message);

      // A rare slug clash fails the whole batch; retry row by row so one
      // bad row doesn't drop the rest.
      let added = 0;
      for (const row of rows) {
        const single = await insert([row]);
        if (!single.error) added += single.data.length;
      }
      return added;
    },

    async updateFeed(id, patch) {
      const { error } = await db.from("feeds").update(patch).eq("id", id);
      if (error) throw new Error(`Failed to update feed: ${error.message}`);
    },

    async expireBreaking(before) {
      const { error } = await db
        .from("articles")
        .update({ is_breaking: false })
        .eq("is_breaking", true)
        .lt("published_at", before);
      if (error) throw new Error(`Failed to expire breaking stories: ${error.message}`);
    },

    async recentArticles(since) {
      const { data, error } = await db
        .from("articles")
        .select("title, tags, category, source_id")
        .gte("published_at", since)
        .order("published_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(`Failed to load recent articles: ${error.message}`);
      return data.map((article) => ({
        title: article.title,
        tags: article.tags,
        category: article.category as CategorySlug,
        sourceId: article.source_id,
      }));
    },

    async replaceTrends(rows) {
      const { error } = await db.rpc("replace_trends", { items: rows as unknown as Json });
      if (error) throw new Error(`Failed to save trends: ${error.message}`);
    },
  };
}
