import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY are not set — Supabase calls will fail. " +
      "This module is loaded only by cloud-mode paths, but it still must not throw during " +
      "module construction or callers cannot show a recoverable error.",
  );
}

/**
 * Single Supabase client instance, shared by AuthProvider and SupabaseStore
 * so RLS-gated queries always run under the session the auth layer manages.
 *
 * Falls back to placeholder values when unconfigured so construction never
 * throws — createClient() validates its arguments synchronously.
 */
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);

export type CuraSupabaseClient = SupabaseClient;
