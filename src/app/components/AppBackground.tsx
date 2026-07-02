/** The same soft sage/peach pattern used in the iOS splash screens (public/splash/*) — fixed full-bleed layer so the in-app experience matches the PWA launch screen. Served as WebP (8 KB vs the 900 KB source PNG, which only lives on as the splash-screen artwork). */
export function AppBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        backgroundImage: "url(/background.webp)",
        backgroundSize: "cover",
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
