import { useEffect } from "react";
import { usePomodoroStore } from "../../stores/usePomodoroStore";

/**
 * Drijft de focustimer met één seconde-tik zolang hij loopt. Gemodelleerd op
 * `useTaskReminders`: mount één interval, tik meteen, ruim op bij unmount.
 *
 * Hoort op MainShell-niveau te draaien (naast `useTaskReminders`), niet in het
 * focus-scherm zelf — routes/sheets unmounten bij tabwissel, dus alleen zo blijft
 * de timer tikken terwijl je door de app navigeert. De tik leidt de resterende
 * tijd af van `endsAt` en handelt afronden af (zie `usePomodoroStore.tick`).
 */
export function useFocusTimer(): void {
  const status = usePomodoroStore((s) => s.status);
  const tick = usePomodoroStore((s) => s.tick);

  useEffect(() => {
    if (status !== "running") return;
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, tick]);
}
