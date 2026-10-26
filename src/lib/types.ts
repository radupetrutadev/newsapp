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

/** A reader's public page: their profile and how many people follow them. */
export interface PublicProfile extends UserProfile {
  followersCount: number;
  /** When the count was read; see Source.countedAt. Absent on demo data. */
  countedAt?: string;
  joinedAt: string;
}

export interface Comment {
  id: string;
  articleId: string;
  author: UserProfile;
  body: string;
  likesCount: number;
  /** The comment this one replies to, if any, and its author's handle. */
  parentId: string | null;
  replyToHandle: string | null;
  /** When the like count was read; see Article.countedAt. Absent on demo data. */
  countedAt?: string;
  createdAt: string;
}

/** A comment listed on its author's page, with the story it's on. */
export interface UserComment extends Comment {
  article: { slug: string; title: string } | null;
}

export interface Trend {
  id: string;
  /** Context line shown above the topic, e.g. "Technology · Trending". */
  context: string;
  topic: string;
  postsCount: number;
  category: CategorySlug;
}

export type NotificationKind = "breaking" | "like" | "follow" | "reply" | "mention";

/** Who a notification is from: readers, or the source of a breaking story. */
export type NotificationActor =
  | { type: "user"; name: string; handle: string; avatarUrl: string | null }
  | { type: "source"; name: string; handle: string; color: string; logoUrl: string | null };

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  /** The newest few; `actorsCount` says how many there are in all. */
  actors: NotificationActor[];
  actorsCount: number;
  text: string;
  preview: string | null;
  href: string;
  createdAt: string;
  /** When someone last joined it, e.g. another like. The list is sorted by it. */
  updatedAt: string;
  unread: boolean;
}
