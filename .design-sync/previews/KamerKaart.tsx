import { KamerKaart } from 'cura';

// KamerKaart takes a full RoomView and resolves its icon/art from `iconKey`
// internally. The watercolor PNGs 404 in the capture sandbox, so every card
// shows its designed art-less fallback: a tinted wash + lucide line icon. That
// is a real Cura state (art-less rooms use it) and is what we grade here.
// tasks stays [] — the card only reads `openCount` + `hint`.
const noop = () => {};

export function Keuken() {
  return (
    <KamerKaart
      onClick={noop}
      room={{
        id: 'r-keuken',
        name: 'Keuken',
        iconKey: 'utensils',
        color: '#B8924A',
        owner: 'Sanne',
        tasks: [],
        openCount: 3,
        hint: 'Waarschijnlijk weer toe aan een beurt',
      }}
    />
  );
}

export function Badkamer() {
  return (
    <KamerKaart
      onClick={noop}
      room={{
        id: 'r-badkamer',
        name: 'Badkamer',
        iconKey: 'droplets',
        color: '#5A8FA8',
        tasks: [],
        openCount: 1,
        hint: 'Nog één klusje blijven liggen',
      }}
    />
  );
}

export function AllesGedaan() {
  return (
    <KamerKaart
      onClick={noop}
      room={{
        id: 'r-woonkamer',
        name: 'Woonkamer',
        iconKey: 'sofa',
        color: '#8B6EA8',
        tasks: [],
        openCount: 0,
        hint: 'Nog even goed',
      }}
    />
  );
}
