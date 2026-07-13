import { TimerDisplay } from 'cura';

// The big focustimer face: a ring that fills as the time passes, with the
// remaining m:ss in the Lora display style at its centre. The ring shares the
// app's RingProgress (sage → soft sage → gold at the finish). Renders at its
// natural size (cardMode "single" + a 340x340 viewport are set in config), so
// no wrapper frame is needed.

export function Focus() {
  return <TimerDisplay remainingSec={1470} totalSec={1500} phase="focus" />;
}

export function Pauze() {
  return <TimerDisplay remainingSec={280} totalSec={300} phase="break" />;
}
