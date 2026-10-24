import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./config";
import type { Database } from "./database.types";

// Supabase "secret" keys replace the legacy service_role key; either works.
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function isAdminConfigured(): boolean {
  return supabaseUrl.length > 0 && secretKey.length > 0;
}

/**
 * Service-role client for background jobs (news ingestion). It bypasses RLS,
 * so it must never be used to serve user requests or reach client code.
 */
export function createAdminClient() {
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
