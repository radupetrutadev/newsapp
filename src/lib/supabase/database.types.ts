// Mirrors supabase/migrations.
// Regenerate with: npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      sources: {
        Row: {
          id: string;
          handle: string;
          name: string;
          description: string;
          website: string | null;
          category: string;
          color: string;
          logo_url: string | null;
          verified: boolean;
          followers_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          handle: string;
          name: string;
          description?: string;
          website?: string | null;
          category: string;
          color?: string;
          logo_url?: string | null;
          verified?: boolean;
          followers_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["sources"]["Insert"]>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          slug: string;
          source_id: string;
          title: string;
          summary: string;
          body: string[];
          image_url: string | null;
          url: string | null;
          category: string;
          tags: string[];
          is_breaking: boolean;
          /** A video for the story (https), played in the feed when the reader's autoplay setting is on. */
          video_url: string | null;
          /** Graphic or distressing media, blurred while the reader's sensitive-content setting is on. */
          is_sensitive: boolean;
          read_time_minutes: number;
          comments_count: number;
          reposts_count: number;
          likes_count: number;
          views_count: number;
          published_at: string;
          created_at: string;
          /** Generated from the headline, tags, summary and topic for full-text search. */
          search_vector: unknown;
        };
        Insert: {
          id?: string;
          slug: string;
          source_id: string;
          title: string;
          summary: string;
          body?: string[];
          image_url?: string | null;
          url?: string | null;
          category: string;
          tags?: string[];
          is_breaking?: boolean;
          video_url?: string | null;
          is_sensitive?: boolean;
          read_time_minutes?: number;
          comments_count?: number;
          reposts_count?: number;
          likes_count?: number;
          views_count?: number;
          published_at?: string;
          created_at?: string;
          search_vector?: never;
        };
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          handle: string;
          display_name: string;
          avatar_url: string | null;
          bio: string;
          verified: boolean;
          followers_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string;
          verified?: boolean;
          followers_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          article_id: string;
          /** Null on a deleted reply that others answered, which stays as a placeholder. */
          user_id: string | null;
          body: string;
          likes_count: number;
          parent_id: string | null;
          /** The comment that started the thread; null on that comment. Set by a trigger. */
          root_id: string | null;
          deleted_at: string | null;
          /** Set once enough readers report it. */
          hidden_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id?: string | null;
          body: string;
          likes_count?: number;
          parent_id?: string | null;
          root_id?: string | null;
          deleted_at?: string | null;
          hidden_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["comments"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "comments_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_root_id_fkey";
            columns: ["root_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      trends: {
        Row: {
          id: string;
          context: string;
          topic: string;
          posts_count: number;
          category: string;
          position: number;
        };
        Insert: {
          id?: string;
          context: string;
          topic: string;
          posts_count?: number;
          category: string;
          position?: number;
        };
        Update: Partial<Database["public"]["Tables"]["trends"]["Insert"]>;
        Relationships: [];
      };
      bookmarks: {
        Row: { user_id: string; article_id: string; created_at: string };
        Insert: { user_id: string; article_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["bookmarks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "bookmarks_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      likes: {
        Row: { user_id: string; article_id: string; created_at: string };
        Insert: { user_id: string; article_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["likes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "likes_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      reposts: {
        Row: { user_id: string; article_id: string; created_at: string };
        Insert: { user_id: string; article_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["reposts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reposts_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: { user_id: string; source_id: string; created_at: string };
        Insert: { user_id: string; source_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["follows"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "follows_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      topic_follows: {
        Row: { user_id: string; category: string; created_at: string };
        Insert: { user_id: string; category: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["topic_follows"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          show_images: boolean;
          show_breaking_banner: boolean;
          autoplay_video: boolean;
          hide_sensitive: boolean;
          breaking_alerts: boolean;
          daily_brief: boolean;
          replies_and_mentions: boolean;
          email_digest: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          show_images?: boolean;
          show_breaking_banner?: boolean;
          autoplay_video?: boolean;
          hide_sensitive?: boolean;
          breaking_alerts?: boolean;
          daily_brief?: boolean;
          replies_and_mentions?: boolean;
          email_digest?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
      comment_likes: {
        Row: { user_id: string; comment_id: string; created_at: string };
        Insert: { user_id: string; comment_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["comment_likes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      comment_reports: {
        Row: { comment_id: string; reporter_id: string; reason: string; created_at: string };
        Insert: { comment_id: string; reporter_id: string; reason: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["comment_reports"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey";
            columns: ["comment_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
        ];
      };
      user_follows: {
        Row: { follower_id: string; followee_id: string; created_at: string };
        Insert: { follower_id: string; followee_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["user_follows"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_follows_followee_id_fkey";
            columns: ["followee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          kind: string;
          group_key: string | null;
          comment_id: string | null;
          article_id: string | null;
          created_at: string;
          updated_at: string;
          read_at: string | null;
          pushed_at: string | null;
        };
        // Written by triggers only.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth_key: string; created_at: string };
        // Saved with save_push_subscription.
        Insert: never;
        Update: never;
        Relationships: [];
      };
      email_digests: {
        Row: { user_id: string; week: string; sent_at: string };
        Insert: { user_id: string; week: string; sent_at?: string };
        Update: Partial<Database["public"]["Tables"]["email_digests"]["Insert"]>;
        Relationships: [];
      };
      feeds: {
        Row: {
          id: string;
          source_id: string;
          url: string;
          category: string;
          active: boolean;
          etag: string | null;
          last_modified: string | null;
          last_fetched_at: string | null;
          last_success_at: string | null;
          last_error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          url: string;
          category: string;
          active?: boolean;
          etag?: string | null;
          last_modified?: string | null;
          last_fetched_at?: string | null;
          last_success_at?: string | null;
          last_error?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feeds"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "feeds_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      replace_trends: {
        Args: { items: Json };
        Returns: undefined;
      };
      record_article_view: {
        Args: { article_id: string };
        Returns: undefined;
      };
      // The feed functions return a JSON array of articles rows with "source" embedded.
      for_you_feed: {
        Args: {
          as_of: string;
          page_offset: number;
          page_size: number;
          topics?: string[];
          category?: string | null;
        };
        Returns: Json;
      };
      following_feed: {
        Args: {
          page_size: number;
          category?: string | null;
          before_at?: string | null;
          before_id?: string | null;
        };
        Returns: Json;
      };
      search_articles: {
        Args: { query: string; as_of: string; page_offset: number; page_size: number };
        Returns: Json;
      };
      topic_stats: {
        Args: { since: string };
        Returns: { category: string; stories: number; views: number }[];
      };
      // A JSON array of notifications as built by public.notification_json.
      notifications_page: {
        Args: {
          page_size: number;
          filter?: string;
          before_at?: string | null;
          before_id?: string | null;
        };
        Returns: Json;
      };
      mark_notifications_read: {
        Args: { up_to: string };
        Returns: undefined;
      };
      delete_comment: {
        Args: { comment_id: string };
        Returns: undefined;
      };
      save_push_subscription: {
        Args: { endpoint: string; p256dh: string; auth_key: string };
        Returns: undefined;
      };
      // Like notifications_page, each with the reader's "user_id".
      claim_push_notifications: {
        Args: { max_count?: number };
        Returns: Json;
      };
      claim_digest_recipients: {
        Args: { digest_week: string; max_count?: number };
        Returns: { user_id: string; email: string; display_name: string }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Row<T extends keyof PublicTables> = PublicTables[T]["Row"];
