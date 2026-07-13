import { RoutineKaart } from 'cura';
import { MemoryRouter } from 'react-router';

// The routine card, in its resting COLLAPSED state (ring + name + trigger + a
// soft tone line + "X van Y windowLabel" density + chevron). Density is rolling,
// never a streak. RoutineKaart calls useNavigate, so each cell is wrapped in a
// MemoryRouter to supply router context (otherwise it renders blank).
const noop = () => {};

export function Ochtend() {
  return (
    <MemoryRouter>
      <RoutineKaart
        routine={{
          id: 'r1',
          name: 'Ochtendroutine',
          trigger: 'Elke ochtend',
          doneInWindow: 11,
          windowSize: 14,
          windowLabel: 'ochtenden',
          hint: 'Zit lekker in je ritme',
          tasks: [
            { id: 'a', title: 'Bed opmaken', duration: '3 min', planned: true, done: true },
            { id: 'b', title: 'Aanrecht afnemen', duration: '5 min', planned: true, done: true },
            { id: 'c', title: 'Planten water geven', planned: true, done: false },
          ],
        }}
        onToggleTask={noop}
        onEdit={noop}
      />
    </MemoryRouter>
  );
}

export function Klaar() {
  return (
    <MemoryRouter>
      <RoutineKaart
        routine={{
          id: 'r2',
          name: 'Avondroutine',
          trigger: 'Elke avond',
          doneInWindow: 9,
          windowSize: 14,
          windowLabel: 'avonden',
          hint: 'Mooi afgesloten vandaag',
          tasks: [
            { id: 'a', title: 'Vaatwasser aanzetten', duration: '2 min', planned: true, done: true },
            { id: 'b', title: 'Deur op slot doen', planned: true, done: true },
          ],
        }}
        onToggleTask={noop}
        onEdit={noop}
      />
    </MemoryRouter>
  );
}
