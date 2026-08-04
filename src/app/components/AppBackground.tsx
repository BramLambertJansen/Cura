import { useDaypart } from "../lib/useDaypart";
import { DAYPART_BG } from "../lib/constants";

/**
 * A quiet full-bleed watercolor parchment: fine paper grain and low-contrast
 * pigment blooms without decorative objects, so cards and text stay calm at
 * every scroll position. A second, tinted
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
