import { createClient } from "@supabase/supabase-js";

/**
 * Single Supabase client instance, shared by AuthProvider and SupabaseStore
 * so RLS-gated queries always run under the session the auth layer manages.
 */
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
