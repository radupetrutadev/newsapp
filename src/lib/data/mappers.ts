import type { Row } from "@/lib/supabase/database.types";
import type { Article, CategorySlug, Comment, Source, Trend, UserProfile } from "@/lib/types";

/** Articles with their publisher embedded. */
export const ARTICLE_SELECT = "*, source:sources(*)";

export type ArticleRow = Row<"articles"> & { source: Row<"sources"> | null };
export type CommentRow = Row<"comments"> & { author: Row<"profiles"> | null };

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
    url: row.url,
    category: row.category as CategorySlug,
    tags: row.tags,
    isBreaking: row.is_breaking,
    readTimeMinutes: row.read_time_minutes,
    stats: {
      comments: row.comments_count,
      reposts: row.reposts_count,
      likes: row.likes_count,
      views: row.views_count,
    },
    countedAt,
    publishedAt: row.published_at,
  };
}

export function mapProfile(row: Row<"profiles">): UserProfile {
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

export function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    articleId: row.article_id,
    author: row.author ? mapProfile(row.author) : deletedUser,
    body: row.body,
    likesCount: row.likes_count,
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
