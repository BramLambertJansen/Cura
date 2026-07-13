import { FieldShell } from 'cura';
import { Repeat, ChevronRight } from 'lucide-react';

// Field-like wrapper for non-<input> rows (the Herhalen / Wekker triggers).
// Same background/border/shadow state machine as VeldInput, composed here as a
// tappable "Herhalen" row: lead icon + label + chosen value + chevron.
const frame = { width: 340 } as const;

export function MetWaarde() {
  return (
    <div style={frame}>
      <FieldShell hasValue>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Repeat size={17} className="text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-[0.9375rem] text-foreground">Herhalen</span>
          <span className="text-sm text-muted-foreground">Wekelijks</span>
          <ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" />
        </div>
      </FieldShell>
    </div>
  );
}

export function Focus() {
  return (
    <div style={frame}>
      <FieldShell active hasValue>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Repeat size={17} className="text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-[0.9375rem] text-foreground">Herhalen</span>
          <span className="text-sm text-muted-foreground">Wekelijks</span>
          <ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" />
        </div>
      </FieldShell>
    </div>
  );
}

export function Leeg() {
  return (
    <div style={frame}>
      <FieldShell>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <Repeat size={17} className="text-muted-foreground" aria-hidden="true" />
          <span className="flex-1 text-[0.9375rem] text-foreground">Herhalen</span>
          <span className="text-sm text-muted-foreground/70">Kies een interval</span>
          <ChevronRight size={16} className="text-muted-foreground" aria-hidden="true" />
        </div>
      </FieldShell>
    </div>
  );
}
