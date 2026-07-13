import { PillButton } from 'cura';
import { Plus, Hand } from 'lucide-react';

// Soft sage pill for secondary actions — "Nieuw" in a header, "Ik pak dit" on
// a task. Tinted sage fill, sage label, optional leading glyph.
const noop = () => {};
const row = { display: 'flex', gap: 10, alignItems: 'center' } as const;

export function Nieuw() {
  return (
    <PillButton icon={<Plus size={15} aria-hidden="true" />} onClick={noop}>
      Nieuw
    </PillButton>
  );
}

export function IkPakDit() {
  return (
    <PillButton icon={<Hand size={15} aria-hidden="true" />} onClick={noop}>
      Ik pak dit
    </PillButton>
  );
}

export function Groottes() {
  return (
    <div style={row}>
      <PillButton size="sm" icon={<Plus size={13} aria-hidden="true" />} onClick={noop}>
        Nieuw
      </PillButton>
      <PillButton size="md" icon={<Plus size={15} aria-hidden="true" />} onClick={noop}>
        Nieuw
      </PillButton>
    </div>
  );
}
