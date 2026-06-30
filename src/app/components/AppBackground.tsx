/** The same soft sage/peach pattern used in the iOS splash screens (public/splash/*) — fixed full-bleed layer so the in-app experience matches the PWA launch screen. */
export function AppBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: "url(/background.png)",
        backgroundSize: "cover",
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
