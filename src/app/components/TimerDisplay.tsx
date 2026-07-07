import { Coffee } from "lucide-react";
import type { FocusPhase } from "../../stores/usePomodoroStore";
import { formatCountdown } from "../lib/format";
import { RingProgress } from "./shared";

/**
 * De grote timer-weergave: een ring die vult naarmate de tijd verstrijkt, met de
 * resterende m:ss in de Lora-koptekststijl in het midden. Deelt de bestaande
 * `RingProgress` (sage → zacht sage → goud bij afronden) zodat hij in dezelfde
 * familie past. De ring is `aria-hidden`; de tijd + fase-tekst dragen de
 * betekenis voor screenreaders.
 */
export function TimerDisplay({
  remainingSec, totalSec, phase, size = 248,
}: { remainingSec: number; totalSec: number; phase: FocusPhase; size?: number }) {
  // Verstreken-ratio (0 → 1): de ring vult op i.p.v. leeg te lopen, zodat de
  // kleur-drempels van RingProgress (goud = "klaar") kloppen aan het einde.
  const elapsed = totalSec > 0 ? 1 - remainingSec / totalSec : 0;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <RingProgress value={elapsed} size={size} stroke={10} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display text-foreground tabular-nums leading-none"
          style={{ fontSize: size * 0.24 }}
          aria-label={`${formatCountdown(remainingSec)} resterend`}>
          {formatCountdown(remainingSec)}
        </span>
        <span className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {phase === "break"
            ? <><Coffee size={13} aria-hidden="true" /> Pauze</>
            : "Focus"}
        </span>
      </div>
    </div>
  );
}
