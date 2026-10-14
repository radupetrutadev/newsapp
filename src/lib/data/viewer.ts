import { cache } from "react";
import { demoViewer } from "@/lib/mock/community";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/types";

/**
 * The current user. Returns the demo reader when Supabase is not configured,
 * and null when it is configured but nobody is signed in.
 *
 * Reads cookies when Supabase is configured, so render it inside <Suspense>.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) return demoViewer;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const fallbackHandle = user.email?.split("@")[0] ?? "reader";
  const metadata = user.user_metadata as { display_name?: string; avatar_url?: string };

  return {
    id: user.id,
    handle: profile?.handle ?? fallbackHandle,
    name: profile?.display_name ?? metadata.display_name ?? fallbackHandle,
    avatarUrl: profile?.avatar_url ?? metadata.avatar_url ?? null,
    bio: profile?.bio ?? "",
    verified: profile?.verified ?? false,
    email: user.email ?? null,
    isDemo: false,
    joinedAt: profile?.created_at ?? user.created_at,
    followersCount: 0,
  };
});
