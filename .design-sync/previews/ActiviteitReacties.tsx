import { ActiviteitReacties, Avatar } from 'cura';

// The three subtle one-tap reactions that sit under a Samen activity row — no
// scores, just warmth. Standalone the component is a bare pill row / a one-line
// confirmation, so the preview places it under a minimal feed item (avatar +
// activity line), exactly the Samen-feed context it's built for.
const noop = () => {};

function FeedItem({ name, text, children }: { name: string; text: React.ReactNode; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl bg-card border border-border/60 px-4 py-3 flex items-start gap-2.5"
      style={{ boxShadow: 'var(--shadow-card)', maxWidth: 420 }}>
      <Avatar name={name} size={32} tone="soft" serif />
      <div className="min-w-0">
        <p className="text-sm text-foreground leading-snug">{text}</p>
        {children}
      </div>
    </div>
  );
}

export function Keuze() {
  return (
    <FeedItem name="Tom" text={<><span className="font-medium">Tom</span> heeft de badkamer schoongemaakt</>}>
      <ActiviteitReacties onReact={noop} />
    </FeedItem>
  );
}

export function Gereageerd() {
  return (
    <FeedItem name="Sanne" text={<><span className="font-medium">Sanne</span> heeft de was opgehangen</>}>
      <ActiviteitReacties reacted="mooi_gedaan" onReact={noop} />
    </FeedItem>
  );
}
