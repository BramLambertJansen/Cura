import { StatusBadge } from 'cura';

// Small sage status pill — "Klaar" on a finished routine, or an interval/wekker
// label on a field row. Tinted sage fill, sage semibold text.
const row = { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as const;

export function Klaar() {
  return <StatusBadge>Klaar</StatusBadge>;
}

export function Labels() {
  return (
    <div style={row}>
      <StatusBadge>Wekelijks</StatusBadge>
      <StatusBadge>Dagelijks</StatusBadge>
      <StatusBadge>Elke 3 dagen</StatusBadge>
    </div>
  );
}
