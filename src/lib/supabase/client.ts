import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";
import type { Database } from "./database.types";

/** Browser client for Client Components (realtime, client-side auth calls). */
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
