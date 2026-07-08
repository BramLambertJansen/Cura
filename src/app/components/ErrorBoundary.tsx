import { Component, type ErrorInfo, type ReactNode } from "react";
import { EmptyIllustration } from "./EmptyIllustration";

type State = { hasError: boolean; error: Error | null };

/** Catches render-time errors anywhere below it so a crash shows a calm recovery message instead of a blank white screen (CLAUDE.md §1-2 tone: forgiving, never alarming). */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface the real cause: without this the boundary swallowed the error
    // entirely, leaving only the vague "Er ging iets mis" screen and no way to
    // tell why the app keeps crashing on reload.
    console.error("[Cura] Render-crash opgevangen door ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      const details = [error?.message, error?.stack].filter(Boolean).join("\n\n");
      return (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center bg-background text-center overflow-y-auto"
          style={{
            paddingTop: "var(--safe-top)",
            paddingBottom: "var(--safe-bottom)",
            paddingLeft: "calc(1.5rem + var(--safe-left))",
            paddingRight: "calc(1.5rem + var(--safe-right))",
          }}
          role="alert"
        >
          {/* The sprout-in-clouds watercolor; renders nothing if the file is missing, so the text carries the screen on its own. */}
          <EmptyIllustration className="mb-2" />
          <h1 className="text-xl font-medium text-foreground mb-2 font-display">
            Er ging iets mis
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed">
            Geen zorgen, je gegevens zijn veilig. Probeer de pagina opnieuw te laden.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
            style={{ background: "var(--gradient-primary)" }}>
            Opnieuw laden
          </button>
          {details && (
            // Tucked away so the screen stays calm (§2), but reachable when a
            // reload keeps landing back here — this is what tells you the cause.
            <details className="mt-6 w-full max-w-md text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer select-none">
                Technische details
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-muted p-3 text-[0.7rem] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">
                {details}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
