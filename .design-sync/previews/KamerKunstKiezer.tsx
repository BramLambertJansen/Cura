import { KamerKunstKiezer } from 'cura';

// The artwork picker renders its own 3-column grid of room tiles (from ICONS);
// we only pass the currently-selected `iconKey` + a no-op onChange. Room art
// 404s in the sandbox, so each tile shows RoomThumb's tinted line-icon
// fallback — the selected tile gets its colored ring + check badge.
const noop = () => {};

export function Kiezer() {
  return <KamerKunstKiezer value="sofa" onChange={noop} />;
}

export function KiezerBadkamer() {
  return <KamerKunstKiezer value="droplets" onChange={noop} />;
}
