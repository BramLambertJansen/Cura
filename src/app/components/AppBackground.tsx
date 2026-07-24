import { useDaypart } from "../lib/useDaypart";
import { DAYPART_BG } from "../lib/constants";

/**
 * The same soft sage/peach pattern used in the iOS splash screens
 * (public/splash/*) — fixed full-bleed layer so the in-app experience
 * matches the PWA launch screen. Served as WebP (8 KB vs the 900 KB source
 * PNG, which only lives on as the splash-screen artwork). A second, tinted
 * layer on top shifts with the time of day (ochtend/middag/avond,
 * `useDaypart`) via `mix-blend-mode: soft-light` — a wash over the art, not a
 * replacement of it, so the illustration still reads at every daypart.
 */
export function AppBackground() {
  const daypart = useDaypart();
  return (
    <div aria-hidden="true" className="fixed inset-0 pointer-events-none z-0">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/background.webp)",
          backgroundSize: "cover",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0" style={{ background: DAYPART_BG[daypart], mixBlendMode: "soft-light" }} />
    </div>
  );
}
