import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { resolveDataMode } from "../../data/store";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import type { CuraSupabaseClient } from "../../data/cloud/supabaseClient";
import { LOCAL_USER_ID } from "../../data/local/seed";

/** "passwordRecovery" is a distinct signed-in-ish state: clicking a password-reset
 *  email link lands with a real Supabase session (that's how updateUser() is
 *  allowed to work), but the person hasn't chosen a new password yet — Gate must
 *  show ResetPasswordPage instead of falling straight into the app. */
export type AuthStatus = "loading" | "signedOut" | "signedIn" | "passwordRecovery";

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
  /** Sends a "reset your password" e-mail. Clicking it lands back on the current
   *  URL with a recovery session, which flips status to "passwordRecovery" (see
   *  above) rather than signing the person straight in. No-op in local mode. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sets a new password for the signed-in user. The active session is the
   *  proof of identity, so no current-password re-entry is needed (Supabase's
   *  default). No-op in local mode, which has no online account. Also completes
   *  a pending password recovery: called while status is "passwordRecovery",
   *  it flips status to "signedIn" afterwards so Gate moves on into the app. */
  changePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * How long we wait for Supabase to hand back a stored session before giving up
 * on it. getSession() looks local but isn't always: an expired access token
 * makes it refresh over the network first, and on a phone with no or flaky
 * mobile data that await can hang indefinitely. `status` then never leaves
 * "loading" and Gate shows the breathing-logo skeleton forever — the app simply
 * never starts, with no error and nothing to tap.
 */
const SESSION_TIMEOUT_MS = 8000;

let supabasePromise: Promise<CuraSupabaseClient> | null = null;
function getSupabase(): Promise<CuraSupabaseClient> {
  supabasePromise ??= import("../../data/cloud/supabaseClient").then((m) => m.supabase);
  return supabasePromise;
}

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
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    void getSupabase().then((supabase) => {
      if (cancelled) return;
      // Race, and land on signedOut rather than nowhere. Falling back to the
      // auth screen is recoverable and self-healing: onAuthStateChange below
      // still fires (INITIAL_SESSION / TOKEN_REFRESHED) once Supabase does get
      // an answer, and flips us to signedIn without the user doing anything.
      // Staying on "loading" is the one outcome with no way out.
      // Whichever of the two settles first wins, and the loser must not undo it:
      // onAuthStateChange's own INITIAL_SESSION can land before the timeout does,
      // so an unguarded fallback would demote an already-signed-in user to the
      // auth screen 8 seconds after a perfectly good start.
      let settled = false;
      const applySession = (session: Session | null, event?: AuthChangeEvent) => {
        if (cancelled) return;
        settled = true;
        // A password-recovery link establishes a real session (Supabase's own
        // mechanism for letting the next updateUser() call succeed) — without
        // this branch that session would read as an ordinary sign-in and Gate
        // would skip straight past the "choose a new password" step.
        setStatus(event === "PASSWORD_RECOVERY" ? "passwordRecovery" : session ? "signedIn" : "signedOut");
        setUserId(session?.user.id ?? null);
        setEmail(session?.user.email ?? null);
      };

      const sessionTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SESSION_TIMEOUT_MS));
      void Promise.race([
        supabase.auth.getSession().then(({ data }) => data.session),
        sessionTimeout,
      ])
        // Also catch: an unhandled rejection here used to leave status on
        // "loading" just as permanently as a hang did.
        .catch(() => null)
        .then((session) => {
          // Only break the tie if nothing has reported yet — a real event that
          // already arrived is always the better answer than "we gave up".
          if (!settled) applySession(session);
        });
      // Always wins over the race above, before or after it: a real auth event
      // is the source of truth, and a late one heals a start that had to fall
      // back to signedOut.
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => applySession(session, event));
      unsubscribe = () => sub.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [mode]);

  const value: AuthContextValue = {
    status,
    userId,
    email,
    async signUp(email, password, displayName) {
      const supabase = await getSupabase();
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
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signInWithMagicLink(email) {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.href },
      });
      if (error) throw error;
    },
    async sendPasswordReset(email) {
      if (mode === "local") return;
      const supabase = await getSupabase();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href,
      });
      if (error) throw error;
    },
    async changePassword(newPassword) {
      if (mode === "local") return;
      const supabase = await getSupabase();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      if (status === "passwordRecovery") setStatus("signedIn");
    },
    async signOut() {
      if (mode === "local") return;
      // scope: "local" clears the session on this device without waiting on a
      // server round-trip to revoke it everywhere — a flaky/slow Supabase
      // connection must never be able to strand the user in a signed-in state.
      const supabase = await getSupabase();
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
