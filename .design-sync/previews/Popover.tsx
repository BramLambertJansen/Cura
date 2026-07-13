import { Popover, PopoverTrigger, PopoverContent, Button } from 'cura';
import { Clock, Sunrise, CalendarDays, CalendarClock } from 'lucide-react';

// Radix Popover only shows content while open, so each card mounts it with
// `defaultOpen`. The content portals to <body> but Floating-UI anchors it to
// the trigger, so it lands just under the button inside this cream frame
// (cardMode "single" + a 440x420 viewport, per config). on-brand Dutch content.
const noop = () => {};

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        width: 400,
        height: 380,
        background: 'var(--background)',
        overflow: 'hidden',
        borderRadius: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 28 }}>{children}</div>
    </div>
  );
}

export function Herinnering() {
  return (
    <Frame>
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <CalendarClock aria-hidden="true" /> Herinnering
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 6px' }}>Wanneer herinneren?</p>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={noop}>
              <Clock aria-hidden="true" /> Vanavond om 19:00
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={noop}>
              <Sunrise aria-hidden="true" /> Morgenochtend
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={noop}>
              <CalendarDays aria-hidden="true" /> Over 3 dagen
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </Frame>
  );
}

export function Bevestiging() {
  return (
    <Frame>
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline">Taak verwijderen</Button>
        </PopoverTrigger>
        <PopoverContent align="center" sideOffset={8}>
          <p style={{ fontWeight: 600, fontSize: 14, margin: '0 0 4px' }}>Taak verwijderen?</p>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', margin: '0 0 12px' }}>
            "Aanrecht afnemen" wordt permanent verwijderd uit Keuken.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={noop}>Annuleren</Button>
            <Button variant="destructive" size="sm" onClick={noop}>Verwijderen</Button>
          </div>
        </PopoverContent>
      </Popover>
    </Frame>
  );
}
