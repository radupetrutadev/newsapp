export type CategorySlug =
  | "world"
  | "politics"
  | "business"
  | "tech"
  | "science"
  | "health"
  | "sports"
  | "entertainment"
  | "climate";

/** A publisher whose articles appear in the feed. */
export interface Source {
  id: string;
  handle: string;
  name: string;
  description: string;
  website: string | null;
  category: CategorySlug;
  /** Brand color used for the generated avatar and profile banner. */
  color: string;
  logoUrl: string | null;
  verified: boolean;
  followersCount: number;
  /**
   * When the counts were read from the database. Cached pages can lag behind
   * the reader's own likes and follows; the client corrects for that. Absent
   * on demo data, whose counts never include the reader.
   */
  countedAt?: string;
  joinedAt: string;
}

export interface ArticleStats {
  comments: number;
  reposts: number;
  likes: number;
  views: number;
}

export interface Article {
  id: string;
  slug: string;
  source: Source;
  title: string;
  summary: string;
  /** Article body, one entry per paragraph. */
  body: string[];
  imageUrl: string | null;
  url: string | null;
  category: CategorySlug;
  tags: string[];
  isBreaking: boolean;
  readTimeMinutes: number;
  stats: ArticleStats;
  /**
   * When the counts were read from the database. Cached pages can lag behind
   * the reader's own likes and follows; the client corrects for that. Absent
   * on demo data, whose counts never include the reader.
   */
  countedAt?: string;
  publishedAt: string;
}

export interface UserProfile {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  bio: string;
  verified: boolean;
}

/** The signed-in user (or the demo user when Supabase is not configured). */
export interface Viewer extends UserProfile {
  email: string | null;
  isDemo: boolean;
  joinedAt: string;
  followersCount: number;
}

export interface Comment {
  id: string;
  articleId: string;
  author: UserProfile;
  body: string;
  likesCount: number;
  createdAt: string;
}

export interface Trend {
  id: string;
  /** Context line shown above the topic, e.g. "Technology · Trending". */
  context: string;
  topic: string;
  postsCount: number;
  category: CategorySlug;
}

export type NotificationKind =
  | "breaking"
  | "like"
  | "repost"
  | "follow"
  | "reply"
  | "mention"
  | "digest";

export interface NotificationActor {
  name: string;
  handle: string;
  color: string;
}

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  actors: NotificationActor[];
  text: string;
  preview: string | null;
  href: string;
  createdAt: string;
  unread: boolean;
}
