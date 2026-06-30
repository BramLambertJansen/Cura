import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { resolveDataMode } from "../../data/store";
import { supabase } from "../../data/cloud/supabaseClient";
import { LOCAL_USER_ID } from "../../data/local/seed";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

interface AuthContextValue {
  status: AuthStatus;
  userId: string | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
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

  useEffect(() => {
    if (mode === "local") return;
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "signedIn" : "signedOut");
      setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? "signedIn" : "signedOut");
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [mode]);

  const value: AuthContextValue = {
    status,
    userId,
    async signUp(email, password, displayName) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { displayName } },
      });
      if (error) throw error;
    },
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signOut() {
      if (mode === "local") return;
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
