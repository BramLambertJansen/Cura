import type { CSSProperties } from "react";
import { AppBackground } from "./AppBackground";
import { Logo } from "./Logo";

/**
 * Calm loading placeholders — no spinners, no layout shift once real content
 * lands (same card chrome/spacing as the real thing). Used for auth/store-init
 * gating, route Suspense fallbacks, and anywhere the app used to show nothing
 * while data was on its way (CLAUDE.md §6/§7: accessible, component-based).
 *
 * The bars "breathe" via `.skeleton-breathe` (theme.css) — a slow, soft fade
 * instead of Tailwind's animate-pulse, whose fast full-to-half blink read as
 * alarming. Cards in a list breathe with a slight per-card delay, so the list
 * ripples gently rather than blinking in lockstep.
 */

const shimmer = "skeleton-breathe bg-muted/50 rounded-2xl";

/** One card-shaped placeholder — matches the standard `Card` chrome/padding. `delay` offsets the breathing phase (seconds). */
export function CardSkeleton({ lines = 2, delay = 0 }: { lines?: number; delay?: number }) {
  const phase: CSSProperties = delay ? { animationDelay: `${delay}s` } : {};
  return (
    <div className="bg-card rounded-2xl border border-border/60 px-4 py-3.5" aria-hidden="true">
      <div className={`h-4 w-2/3 mb-2.5 ${shimmer}`} style={phase} />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className={`h-3 w-1/2 ${shimmer}`} style={{ ...phase, marginTop: i === 0 ? undefined : "0.5rem" }} />
      ))}
    </div>
  );
}

/** A stack of CardSkeletons — for a list of tasks/rooms/routines still loading. */
export function ListSkeleton({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Bezig met laden…">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} delay={i * 0.2} />
      ))}
    </div>
  );
}

/**
 * A full page's worth of placeholder — title + subtitle + a short list. Mirrors
 * `PageHeader` + a card list (including the pages' own px-5/pt-14 offsets) so
 * there's no jump once the real page mounts.
 */
export function PageSkeleton() {
  return (
    <div className="px-5 pt-14" role="status" aria-live="polite" aria-label="Cura wordt geladen…">
      <div className="mb-8">
        <div className={`h-8 w-32 mb-2.5 ${shimmer}`} />
        <div className={`h-4 w-48 ${shimmer}`} />
      </div>
      <ListSkeleton />
    </div>
  );
}

/**
 * Full-screen calm loading state for gates that sit in front of the whole app
 * shell (auth resolving, store init, first-load Suspense) — same background/
 * safe-area treatment as the auth/invite screens so nothing flashes. Shows the
 * softly breathing logo instead of anonymous bars: it's the app's first
 * moment, so it should feel like the splash screen, not like missing content.
 */
export function FullScreenSkeleton() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-background"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
    >
      <AppBackground />
      <div
        className="relative z-10 flex flex-col items-center gap-3 skeleton-breathe"
        style={{ "--skeleton-breathe-min": 0.55, "--skeleton-breathe-max": 0.95 } as CSSProperties}
        role="status" aria-live="polite" aria-label="Cura wordt geladen…"
      >
        <Logo size={56} className="rounded-2xl shadow-sm" />
        <p className="text-sm text-muted-foreground" style={{ fontFamily: "Lora,Georgia,serif", fontStyle: "italic" }}>
          Even rustig opstarten…
        </p>
      </div>
    </div>
  );
}
