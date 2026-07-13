import { BoodschapRij } from 'cura';

// A single boodschappenlijst row: checkbox + title/aantal, quantity −/+ steppers
// and an edit pencil while open; faded + struck-through when checked. It carries
// its own card chrome (bg-card* + hairline + shadow), so it stands alone. The
// component's signature is { item, onToggle, onDelete, onUpdate } — onUpdate is
// required (fires on the steppers/edit), so it's wired here too.
const noop = () => {};

export function Open() {
  return (
    <BoodschapRij
      item={{ id: 'b1', title: 'Melk', quantity: '2 pakken', checked: false, category: 'cold' }}
      onToggle={noop}
      onDelete={noop}
      onUpdate={noop}
    />
  );
}

export function ZonderAantal() {
  return (
    <BoodschapRij
      item={{ id: 'b2', title: 'Wasmiddel', checked: false, category: 'household' }}
      onToggle={noop}
      onDelete={noop}
      onUpdate={noop}
    />
  );
}

export function Afgevinkt() {
  return (
    <BoodschapRij
      item={{ id: 'b3', title: 'Brood', quantity: '1 heel', checked: true, category: 'fresh' }}
      onToggle={noop}
      onDelete={noop}
      onUpdate={noop}
    />
  );
}
