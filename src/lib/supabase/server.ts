import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./config";
import type { Database } from "./database.types";

/**
 * Request-scoped client that reads and refreshes the user's session cookies.
 * Use it for anything user-specific (auth, the viewer's profile, writes).
 */
export async function createClient() {
  // Supabase Auth reads the clock to check the session's expiry. Next.js
  // doesn't allow that while prerendering (including prefetched App Shells),
  // so io() defers it; during a request or Server Action it resolves at once.
  await io();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Cookie-free client for public content (articles, sources, trends).
 * Safe to use inside "use cache" functions because it never touches the request.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
