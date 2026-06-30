import { Component, type ReactNode } from "react";

/** Catches render-time errors anywhere below it so a crash shows a calm recovery message instead of a blank white screen (CLAUDE.md §1-2 tone: forgiving, never alarming). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-dvh flex flex-col items-center justify-center bg-background text-center"
          style={{
            paddingTop: "var(--safe-top)",
            paddingBottom: "var(--safe-bottom)",
            paddingLeft: "calc(1.5rem + var(--safe-left))",
            paddingRight: "calc(1.5rem + var(--safe-right))",
          }}
          role="alert"
        >
          <span className="text-4xl mb-4 select-none" aria-hidden="true">🌿</span>
          <h1 className="text-xl font-medium text-foreground mb-2" style={{ fontFamily: "Lora,Georgia,serif" }}>
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
        </div>
      );
    }
    return this.props.children;
  }
}
