export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

// Supabase now issues "publishable" keys; projects created earlier use the
// legacy anon key. Either works for the browser and server clients.
export const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * When the Supabase env vars are missing the app runs in demo mode:
 * all reads come from src/lib/mock and auth actions explain how to connect.
 */
export function isSupabaseConfigured(): boolean {
  return supabaseUrl.length > 0 && supabaseKey.length > 0;
}
