import { Card } from 'cura';
import { ChevronRight } from 'lucide-react';

// Standard card chrome — hairline border, soft shadow, class-driven fill.
// Compose content inside; tone="active" swaps to the warmer day-view fill;
// passing onClick renders a tappable row with a focus outline.
const noop = () => {};

export function Standaard() {
  return (
    <Card>
      <p className="font-medium text-foreground font-display">Weekplanning</p>
      <p className="text-sm text-muted-foreground mt-1">12 taken verdeeld over 3 kamers</p>
    </Card>
  );
}

export function Actief() {
  return (
    <Card tone="active">
      <p className="font-medium text-foreground font-display">Vandaag samen</p>
      <p className="text-sm text-muted-foreground mt-1">Sanne en Tom pakken vijf taken op</p>
    </Card>
  );
}

export function Aantikbaar() {
  return (
    <Card onClick={noop}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">Huishouden</p>
          <p className="text-sm text-muted-foreground mt-1">Meldingen, thema en leden</p>
        </div>
        <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
      </div>
    </Card>
  );
}
