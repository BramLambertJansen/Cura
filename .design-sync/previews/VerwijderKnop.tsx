import { VerwijderKnop } from 'cura';

// Destructive delete affordance at the foot of an edit sheet. At rest it's a
// quiet full-width red "Trash + label" button; tapping it flips to an inline
// "Toch niet / Ja, verwijder" confirm row (a click-only state — the resting
// button is the correct static card). Wrapped at a sheet-ish width.
const frame = { width: 320 } as const;
const noop = () => {};

export function Kamer() {
  return (
    <div style={frame}>
      <VerwijderKnop label="Kamer verwijderen" ariaLabel="Keuken verwijderen" onConfirm={noop} />
    </div>
  );
}

export function Routine() {
  return (
    <div style={frame}>
      <VerwijderKnop label="Routine verwijderen" onConfirm={noop} />
    </div>
  );
}
