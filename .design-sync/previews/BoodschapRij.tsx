import { BoodschapRij } from 'cura';

// A single boodschappenlijst row inside a category card: an animated checkbox +
// title/aantal that toggles on tap, and swipe-left-to-delete. It carries no card
// chrome of its own (the group card supplies the rounded border + shadow), and
// `isLast` drops the hairline divider on the final row. Signature is
// { item, onToggle, onDelete, isLast } — amount/unit/category are set in the add
// sheet, so the row itself has no steppers or inline edit.
const noop = () => {};

// Give the chrome-less rows the group-card frame they live in, so the preview
// reads the way they actually render on the page.
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ borderRadius: 24, border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)', background: 'var(--card)', padding: '0 16px', width: 320 }}>
      {children}
    </div>
  );
}

export function Open() {
  return (
    <Card>
      <BoodschapRij
        item={{ id: 'b1', title: 'Melk', quantity: '2 l', checked: false, category: 'cold' }}
        onToggle={noop}
        onDelete={noop}
        isLast
      />
    </Card>
  );
}

export function MetRij() {
  return (
    <Card>
      <BoodschapRij
        item={{ id: 'b1', title: 'Bananen', quantity: '1 kg', checked: false, category: 'fresh' }}
        onToggle={noop}
        onDelete={noop}
      />
      <BoodschapRij
        item={{ id: 'b2', title: 'Wc-papier', checked: false, category: 'household' }}
        onToggle={noop}
        onDelete={noop}
        isLast
      />
    </Card>
  );
}

export function Afgevinkt() {
  return (
    <Card>
      <BoodschapRij
        item={{ id: 'b3', title: 'Brood', quantity: '1', checked: true, category: 'pantry' }}
        onToggle={noop}
        onDelete={noop}
        isLast
      />
    </Card>
  );
}
