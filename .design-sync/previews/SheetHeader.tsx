import { SheetHeader } from 'cura';

// Sheet title row — Lora title on the left, a round close X on the right.
// Wrapped at a sheet-ish width so the two ends sit apart the way they do
// at the top of an open sheet.
const noop = () => {};
const frame = { width: 360 } as const;

export function TaakBewerken() {
  return (
    <div style={frame}>
      <SheetHeader title="Taak bewerken" onClose={noop} />
    </div>
  );
}

export function RoutineToevoegen() {
  return (
    <div style={frame}>
      <SheetHeader title="Routine toevoegen" onClose={noop} />
    </div>
  );
}
