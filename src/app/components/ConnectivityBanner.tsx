import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { resolveDataMode } from "../../data/store";
import { useOnlineStatus } from "../lib/useOnlineStatus";

/**
 * Calm offline/online notice. Local mode already works fully offline (it's
 * just localStorage), so it only gets a reassuring toast on the transition —
 * no persistent chrome. Cloud mode gets the same toast plus a small pill
 * while offline, since writes there genuinely can't sync until reconnected
 * and there's no offline write queue (yet) to promise otherwise.
 */
export function ConnectivityBanner() {
  const online = useOnlineStatus();
  const mode = resolveDataMode();
  const prevOnline = useRef(online);

  useEffect(() => {
    if (prevOnline.current === online) return;
    prevOnline.current = online;
    if (online) {
      toast.success("Weer verbonden");
    } else {
      toast(
        mode === "cloud"
          ? "Je bent offline — wijzigingen lukken pas als de verbinding terug is."
          : "Je bent offline. Cura blijft gewoon werken.",
      );
    }
  }, [online, mode]);

  if (online || mode !== "cloud") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 z-[60] flex justify-center pointer-events-none"
      style={{ top: "calc(var(--safe-top) + 0.5rem)" }}
    >
      <div
        className="px-4 py-2 rounded-full text-xs font-medium text-center"
        style={{ background: "var(--secondary)", color: "var(--muted-foreground)", boxShadow: "var(--shadow-card)" }}
      >
        Offline — wijzigingen lukken pas als je weer verbinding hebt
      </div>
    </div>
  );
}
