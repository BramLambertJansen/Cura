import { Sheet, SheetHeader, VeldInput, PrimaryButton, KeuzeChip, Kop } from 'cura';

// The Sheet positions itself against its nearest positioned ancestor, so the
// preview supplies a phone-sized, cream-backed frame for the backdrop + panel
// to render inside (rather than escaping to the page). cardMode "single" +
// a 400x640 viewport (config) give it room. onClose is a no-op in the card.
const noop = () => {};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 380,
        height: 600,
        background: 'var(--background)',
        overflow: 'hidden',
        borderRadius: 20,
      }}
    >
      {children}
    </div>
  );
}

export function TaakToevoegen() {
  return (
    <Frame>
      <Sheet onClose={noop}>
        <SheetHeader title="Taak toevoegen" onClose={noop} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <VeldInput value="Aanrecht afnemen" onChange={noop} placeholder="Wat moet er gebeuren?" />
          <div>
            <Kop>In welke kamer?</Kop>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <KeuzeChip selected onClick={noop}>Keuken</KeuzeChip>
              <KeuzeChip selected={false} onClick={noop}>Badkamer</KeuzeChip>
              <KeuzeChip selected={false} onClick={noop}>Woonkamer</KeuzeChip>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <PrimaryButton onClick={noop}>Toevoegen</PrimaryButton>
          </div>
        </div>
      </Sheet>
    </Frame>
  );
}
