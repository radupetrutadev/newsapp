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
          read_time_minutes: number;
          comments_count: number;
          reposts_count: number;
          likes_count: number;
          views_count: number;
          published_at: string;
          created_at: string;
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
          read_time_minutes?: number;
          comments_count?: number;
          reposts_count?: number;
          likes_count?: number;
          views_count?: number;
          published_at?: string;
          created_at?: string;
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
          created_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string;
          verified?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          article_id: string;
          user_id: string;
          body: string;
          likes_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id: string;
          user_id: string;
          body: string;
          likes_count?: number;
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
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Row<T extends keyof PublicTables> = PublicTables[T]["Row"];
