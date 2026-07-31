// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

/**
 * The startup-hang guard (§App-shell). AuthProvider's `status` gates the whole
 * app behind Gate's FullScreenSkeleton, so a getSession() that never settles —
 * a phone on dead mobile data, an access token that can't be refreshed — used to
 * mean Cura simply never started, with no error and nothing to tap.
 */

// resolveDataMode() reads import.meta.env, which the test env pins to "local";
// force cloud so the Supabase branch under test actually runs.
vi.mock("../../data/store", () => ({ resolveDataMode: () => "cloud" }));

type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

let getSession: () => Promise<{ data: { session: Session | null } }>;
let listener: AuthListener | null = null;
const unsubscribe = vi.fn();

vi.mock("../../data/cloud/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      onAuthStateChange: (cb: AuthListener) => {
        listener = cb;
        return { data: { subscription: { unsubscribe } } };
      },
    },
  },
}));

const SESSION: Session = { user: { id: "u1", email: "bram@example.com" } } as Session;

/** Flush pending microtasks + timers inside act(), so React commits the result. */
async function tick(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

/**
 * Renders the provider and surfaces `status` as text so we can assert on it.
 * AuthProvider reaches Supabase through a dynamic import(), so we wait for the
 * auth listener to be registered — proof the effect body actually ran — rather
 * than guessing how many microtask ticks that import needs.
 */
async function renderProvider() {
  const { AuthProvider, useAuth } = await import("./AuthProvider");
  function Probe() {
    const { status, userId } = useAuth();
    return <span data-testid="status">{`${status}:${userId ?? "-"}`}</span>;
  }
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  for (let i = 0; i < 20 && !listener; i++) await tick();
  if (!listener) throw new Error("AuthProvider never subscribed to auth changes");
}

const status = () => screen.getByTestId("status").textContent;

/** Fire a Supabase auth event the way the real client would. */
async function emit(event: AuthChangeEvent, session: Session | null) {
  await act(async () => {
    listener?.(event, session);
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  listener = null;
  unsubscribe.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("AuthProvider startup", () => {
  it("falls back to signedOut when getSession never settles, instead of hanging on loading", async () => {
    getSession = () => new Promise(() => {}); // never resolves — the dead-network case
    await renderProvider();
    await tick();
    expect(status()).toBe("loading:-");

    await tick(8000);
    expect(status()).toBe("signedOut:-");
  });

  it("falls back to signedOut when getSession rejects", async () => {
    getSession = () => Promise.reject(new Error("Failed to fetch"));
    await renderProvider();
    await tick();
    expect(status()).toBe("signedOut:-");
  });

  it("heals a timed-out start once a real auth event arrives", async () => {
    getSession = () => new Promise(() => {});
    await renderProvider();
    await tick(8000);
    expect(status()).toBe("signedOut:-");

    await emit("TOKEN_REFRESHED", SESSION);
    await tick();
    expect(status()).toBe("signedIn:u1");
  });

  it("does not let the timeout demote a session the auth listener already reported", async () => {
    // INITIAL_SESSION can land before the 8s fallback fires; an unguarded
    // fallback would sign a perfectly-started user out 8 seconds in.
    getSession = () => new Promise(() => {});
    await renderProvider();
    await tick();
    await emit("INITIAL_SESSION", SESSION);
    await tick();
    expect(status()).toBe("signedIn:u1");

    await tick(20000);
    expect(status()).toBe("signedIn:u1");
  });

  it("still signs in normally when getSession answers in time", async () => {
    getSession = () => Promise.resolve({ data: { session: SESSION } });
    await renderProvider();
    await tick();
    expect(status()).toBe("signedIn:u1");
  });

  it("keeps routing a recovery session to passwordRecovery, not signedIn", async () => {
    getSession = () => Promise.resolve({ data: { session: null } });
    await renderProvider();
    await tick();

    await emit("PASSWORD_RECOVERY", SESSION);
    await tick();
    expect(status()).toBe("passwordRecovery:u1");
  });
});
