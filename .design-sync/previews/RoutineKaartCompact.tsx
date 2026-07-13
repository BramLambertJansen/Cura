import { RoutineKaartCompact } from 'cura';
import { MemoryRouter } from 'react-router';

// The timeline-variant routine tile — a fixed-width card for Vandaag's
// horizontally scrolling row: ring progress + name + soft tone line + a "Start"
// pill, or a "Klaar" badge once everything's done. It calls useNavigate, so each
// cell is wrapped in a MemoryRouter, and constrained to its ~180px tile width.

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <MemoryRouter>
      <div style={{ width: 180 }}>{children}</div>
    </MemoryRouter>
  );
}

export function Bezig() {
  return (
    <Tile>
      <RoutineKaartCompact
        routine={{
          id: 'r1',
          name: 'Ochtendroutine',
          trigger: 'Elke ochtend',
          doneInWindow: 11,
          windowSize: 14,
          windowLabel: 'ochtenden',
          hint: 'Zit lekker in je ritme',
          tasks: [
            { id: 'a', title: 'Bed opmaken', planned: true, done: true },
            { id: 'b', title: 'Aanrecht afnemen', planned: true, done: false },
            { id: 'c', title: 'Planten water geven', planned: true, done: false },
          ],
        }}
      />
    </Tile>
  );
}

export function Af() {
  return (
    <Tile>
      <RoutineKaartCompact
        routine={{
          id: 'r2',
          name: 'Avondroutine',
          trigger: 'Elke avond',
          doneInWindow: 12,
          windowSize: 14,
          windowLabel: 'avonden',
          hint: 'Mooi afgesloten',
          tasks: [
            { id: 'a', title: 'Vaatwasser aanzetten', planned: true, done: true },
            { id: 'b', title: 'Deur op slot doen', planned: true, done: true },
          ],
        }}
      />
    </Tile>
  );
}
