import type { CSSProperties } from "react";
import { AppBackground } from "./AppBackground";
import { EmptyIllustration } from "./EmptyIllustration";

/**
 * Calm full-screen error for gates in front of the app shell — mirrors
 * FullScreenSkeleton's background/safe-area treatment so a failed initial load
 * feels like a gentle "let's try again", not a crash (CLAUDE.md §1-2: forgiving,
 * never alarming). Distinct from ErrorBoundary (which catches render-time throws
 * and can only offer a hard reload); this one retries in place via onRetry.
 */
export function FullScreenError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-background text-center"
      style={{
        paddingTop: "var(--safe-top)",
        paddingBottom: "var(--safe-bottom)",
        paddingLeft: "calc(1.5rem + var(--safe-left))",
        paddingRight: "calc(1.5rem + var(--safe-right))",
      } as CSSProperties}
      role="alert"
    >
      <AppBackground />
      <div className="relative z-10 flex flex-col items-center">
        <EmptyIllustration className="mb-2" />
        <h1 className="text-xl font-medium text-foreground mb-2 font-display">
          Laden lukte even niet
        </h1>
        <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
          Geen zorgen, je gegevens zijn veilig. Controleer je verbinding en probeer het opnieuw.
        </p>
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-full text-sm font-semibold text-white focus-ring"
          style={{ background: "var(--gradient-primary)" }}
        >
          Opnieuw proberen
        </button>
      </div>
    </div>
  );
}
