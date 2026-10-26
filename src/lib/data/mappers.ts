import type { Row } from "@/lib/supabase/database.types";
import type { Article, CategorySlug, Comment, PublicProfile, Source, Trend, UserProfile } from "@/lib/types";

/**
 * Articles with their publisher embedded. Columns are listed so the search
 * vector, which only the database needs, isn't sent with every story.
 */
export const ARTICLE_SELECT = `
  id, slug, source_id, title, summary, body, image_url, video_url, url, category, tags,
  is_breaking, is_sensitive, read_time_minutes, comments_count, reposts_count, likes_count, views_count, published_at,
  created_at, cluster_id, source:sources(*), cluster:story_clusters(articles_count, sources_count)
`;

export type ArticleRow = Omit<Row<"articles">, "search_vector"> & {
  source: Row<"sources"> | null;
  cluster: Pick<Row<"story_clusters">, "articles_count" | "sources_count"> | null;
};

/**
 * Comments with their author and the handle of the person they reply to.
 * comment_likes also links comments and profiles, so the author is named by
 * its foreign key.
 */
export const COMMENT_SELECT = "*, author:profiles!user_id(*), parent:parent_id(author:profiles!user_id(handle))";

export type ProfileRow = Row<"profiles">;
export type CommentRow = Row<"comments"> & {
  author: ProfileRow | null;
  parent: { author: { handle: string } | null } | null;
};

export function fail(what: string, error: { message: string }): never {
  throw new Error(`Supabase: failed to load ${what}: ${error.message}`);
}

export function mapSource(row: Row<"sources">, countedAt: string): Source {
  return {
    id: row.id,
    handle: row.handle,
    name: row.name,
    description: row.description,
    website: row.website,
    category: row.category as CategorySlug,
    color: row.color,
    logoUrl: row.logo_url,
    verified: row.verified,
    followersCount: row.followers_count,
    countedAt,
    joinedAt: row.created_at,
  };
}

export function mapArticle(row: ArticleRow, countedAt: string): Article {
  if (!row.source) throw new Error(`Article ${row.id} has no source`);
  return {
    id: row.id,
    slug: row.slug,
    source: mapSource(row.source, countedAt),
    title: row.title,
    summary: row.summary,
    body: row.body,
    imageUrl: row.image_url,
    videoUrl: row.video_url,
    url: row.url,
    category: row.category as CategorySlug,
    tags: row.tags,
    isBreaking: row.is_breaking,
    isSensitive: row.is_sensitive,
    readTimeMinutes: row.read_time_minutes,
    stats: {
      comments: row.comments_count,
      reposts: row.reposts_count,
      likes: row.likes_count,
      views: row.views_count,
    },
    coverage:
      row.cluster_id && row.cluster
        ? { clusterId: row.cluster_id, stories: row.cluster.articles_count, sources: row.cluster.sources_count }
        : null,
    countedAt,
    publishedAt: row.published_at,
  };
}

export function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    handle: row.handle,
    name: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    verified: row.verified,
  };
}

const deletedUser: UserProfile = {
  id: "deleted",
  handle: "deleted",
  name: "Deleted user",
  avatarUrl: null,
  bio: "",
  verified: false,
};

export function mapPublicProfile(row: ProfileRow, countedAt: string): PublicProfile {
  return { ...mapProfile(row), followersCount: row.followers_count, countedAt, joinedAt: row.created_at };
}

export function mapComment(row: CommentRow, countedAt: string): Comment {
  // A hidden reply's text stays in the database for review, but isn't sent on.
  const removed = row.deleted_at ? "deleted" : row.hidden_at ? "hidden" : null;
  return {
    id: row.id,
    articleId: row.article_id,
    author: row.author && !removed ? mapProfile(row.author) : deletedUser,
    body: removed ? "" : row.body,
    likesCount: removed ? 0 : row.likes_count,
    parentId: row.parent_id,
    replyToHandle: row.parent?.author?.handle ?? null,
    rootId: row.root_id,
    removed,
    countedAt,
    createdAt: row.created_at,
  };
}

export function mapTrend(row: Row<"trends">): Trend {
  return {
    id: row.id,
    context: row.context,
    topic: row.topic,
    postsCount: row.posts_count,
    category: row.category as CategorySlug,
  };
}
