import { HintBanner } from 'cura';

// Soft, italic hint line in a tinted card — the gentle "waarschijnlijk weer
// toe" nudge. sage tone leans in warmly; muted tone recedes into a soft tip.
export function Sage() {
  return (
    <HintBanner>
      Waarschijnlijk weer toe aan een beurt — de badkamer is al acht dagen niet gedaan.
    </HintBanner>
  );
}

export function Muted() {
  return (
    <HintBanner tone="muted">
      Verdeel de grote klussen over de week, dan blijft het licht voor iedereen.
    </HintBanner>
  );
}
