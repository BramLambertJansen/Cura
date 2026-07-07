import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { resolveDataMode } from "../../data/store";
import { supabase } from "../../data/cloud/supabaseClient";
import { LOCAL_USER_ID } from "../../data/local/seed";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  /** Resolves with needsConfirmation: true when the Supabase project requires
   *  email confirmation — signUp then succeeds without starting a session. */
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  /** Sends a passwordless sign-in link to the given address (creates the
   *  account on first use). Clicking it lands back on the current URL, so
   *  an invite token in the path survives the round trip. */
  signInWithMagicLink: (email: string) => Promise<void>;
  /** Sets a new password for the signed-in user. The active session is the
   *  proof of identity, so no current-password re-entry is needed (Supabase's
   *  default). No-op in local mode, which has no online account. */
  changePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Always mounted, mode-aware: in local mode it resolves to signedIn
 * synchronously (matching seed.ts's fixed implicit user) so App.tsx doesn't
 * need its own local/cloud branching. Only cloud mode talks to Supabase auth.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const mode = resolveDataMode();
  const [status, setStatus] = useState<AuthStatus>(mode === "local" ? "signedIn" : "loading");
  const [userId, setUserId] = useState<string | null>(mode === "local" ? LOCAL_USER_ID : null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "local") return;
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "signedIn" : "signedOut");
      setUserId(data.session?.user.id ?? null);
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "signedIn" : "signedOut");
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [mode]);

  const value: AuthContextValue = {
    status,
    userId,
    email,
    async signUp(email, password, displayName) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { displayName } },
      });
      if (error) throw error;
      // No session back means the project requires email confirmation —
      // the caller needs to tell the user to check their inbox.
      return { needsConfirmation: !data.session };
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signInWithMagicLink(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) throw error;
    },
    async changePassword(newPassword) {
      if (mode === "local") return;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    async signOut() {
      if (mode === "local") return;
      // scope: "local" clears the session on this device without waiting on a
      // server round-trip to revoke it everywhere — a flaky/slow Supabase
      // connection must never be able to strand the user in a signed-in state.
      await supabase.auth.signOut({ scope: "local" });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
