import { AppBackground } from "./AppBackground";

/**
 * Calm loading placeholders — no spinners, no layout shift once real content
 * lands (same card chrome/spacing as the real thing). Used for auth/store-init
 * gating, route Suspense fallbacks, and anywhere the app used to show nothing
 * while data was on its way (CLAUDE.md §6/§7: accessible, component-based).
 */

const shimmer = "animate-pulse bg-muted/60 rounded-2xl";

/** One card-shaped placeholder — matches the standard `Card` chrome/padding. */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="bg-card rounded-2xl border border-border/60 px-4 py-3.5" aria-hidden="true">
      <div className={`h-4 w-2/3 mb-2.5 ${shimmer}`} />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div key={i} className={`h-3 w-1/2 ${shimmer}`} style={{ marginTop: i === 0 ? undefined : "0.5rem" }} />
      ))}
    </div>
  );
}

/** A stack of CardSkeletons — for a list of tasks/rooms/routines still loading. */
export function ListSkeleton({ count = 3, lines = 2 }: { count?: number; lines?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Bezig met laden…">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </div>
  );
}

/**
 * A full page's worth of placeholder — title + subtitle + a short list. Mirrors
 * `PageHeader` + a card list so there's no jump once the real page mounts.
 */
export function PageSkeleton() {
  return (
    <div className="px-5 pt-2" role="status" aria-live="polite" aria-label="Cura wordt geladen…">
      <div className="mb-8">
        <div className={`h-7 w-32 mb-2 ${shimmer}`} />
        <div className={`h-4 w-48 ${shimmer}`} />
      </div>
      <ListSkeleton />
    </div>
  );
}

/**
 * Full-screen calm loading state for gates that sit in front of the whole app
 * shell (auth resolving, store init, first-load Suspense) — same background/
 * safe-area treatment as the auth/invite screens so nothing flashes.
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
      <div className="relative z-10 w-full max-w-sm px-6" role="status" aria-live="polite" aria-label="Cura wordt geladen…">
        <div className={`h-4 w-24 mx-auto ${shimmer}`} />
      </div>
    </div>
  );
}
