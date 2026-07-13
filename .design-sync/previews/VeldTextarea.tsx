import { VeldTextarea } from 'cura';

// Multi-line note field — same field chrome as VeldInput, no resize handle.
const noop = () => {};
const frame = { width: 340 } as const;

export function Ingevuld() {
  return (
    <div style={frame}>
      <VeldTextarea
        value="Denk aan de planten op de vensterbank en geef de grote ficus in de woonkamer wat extra water."
        onChange={noop}
        placeholder="Voeg een notitie toe…"
        rows={4}
      />
    </div>
  );
}

export function Leeg() {
  return (
    <div style={frame}>
      <VeldTextarea value="" onChange={noop} placeholder="Voeg een notitie toe…" rows={4} />
    </div>
  );
}
