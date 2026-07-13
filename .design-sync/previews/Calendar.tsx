import { Calendar } from 'cura';

// react-day-picker in single-select mode, dressed in a picker-surface card so
// it reads as the date popover a planner would open. The capture clock is
// fixed at 15 May 2024, so "today" (sage-tinted accent) and the chosen day
// (solid sage) both show. weekStartsOn=1 gives the Dutch Monday-first week.
const surface = {
  display: 'inline-block',
  background: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  boxShadow: '0 10px 30px rgba(30, 41, 24, 0.08)',
} as const;

export function Enkel() {
  return (
    <div style={surface}>
      <Calendar
        mode="single"
        weekStartsOn={1}
        defaultMonth={new Date(2024, 4, 1)}
        selected={new Date(2024, 4, 22)}
        onSelect={() => {}}
      />
    </div>
  );
}

export function VolgendeMaand() {
  return (
    <div style={surface}>
      <Calendar
        mode="single"
        weekStartsOn={1}
        defaultMonth={new Date(2024, 5, 1)}
        selected={new Date(2024, 5, 3)}
        onSelect={() => {}}
      />
    </div>
  );
}
