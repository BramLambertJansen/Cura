import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are not set — Supabase calls will fail. " +
      "This module is imported unconditionally by AuthProvider, even in local mode, so it " +
      "must not throw here or the whole app fails to load (white screen) regardless of VITE_DATA_MODE.",
  );
}

/**
 * Single Supabase client instance, shared by AuthProvider and SupabaseStore
 * so RLS-gated queries always run under the session the auth layer manages.
 *
 * Falls back to placeholder values when unconfigured so construction never
 * throws — createClient() validates its arguments synchronously, and this
 * module loads unconditionally regardless of VITE_DATA_MODE (see warning above).
 */
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);
