import { useEffect, useState } from "react";

/**
 * Live height of the on-screen keyboard, derived from the gap between the
 * layout viewport and the visual viewport. Browsers that honour the
 * `interactive-widget=resizes-content` viewport hint (recent Chrome/Safari)
 * shrink the layout viewport for the keyboard too, so `window.innerHeight`
 * shrinks right alongside `visualViewport.height` and this stays ~0 — the
 * dvh-based sizing in Sheet already handles those. Older browsers (notably
 * iOS Safari pre-17) keep the layout viewport full height and only shrink
 * the visual one, which is what this hook detects, so a bottom-anchored
 * sheet can move itself above the keyboard instead of being covered by it.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      setInset(Math.round(Math.max(0, window.innerHeight - vv.height - vv.offsetTop)));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
