import { Avatar } from 'cura';

// Initial-letter avatar for a household member. Decorative, so it's always
// paired with a visible name. `tone` runs solid (gradient) → softStrong → soft;
// `shape` toggles circle vs. rounded square.
const lid = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 } as const;
const naam = { fontSize: 13, fontWeight: 500, color: 'var(--foreground)' } as const;

export function Leden() {
  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={lid}>
        <Avatar name="Sanne" tone="solid" size={44} />
        <span style={naam}>Sanne</span>
      </div>
      <div style={lid}>
        <Avatar name="Tom" tone="softStrong" size={44} />
        <span style={naam}>Tom</span>
      </div>
      <div style={lid}>
        <Avatar name="Lisa" tone="soft" size={44} />
        <span style={naam}>Lisa</span>
      </div>
    </div>
  );
}

export function Vormen() {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
      <div style={lid}>
        <Avatar name="Sanne" tone="soft" shape="circle" size={48} />
        <span style={naam}>Cirkel</span>
      </div>
      <div style={lid}>
        <Avatar name="Tom" tone="soft" shape="rounded" size={48} />
        <span style={naam}>Afgerond</span>
      </div>
    </div>
  );
}
