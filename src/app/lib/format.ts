const DAY_NL = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];
const MON_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export function getGreeting() {
  const h = new Date().getHours();
  const d = new Date();
  const date = `${DAY_NL[d.getDay()]}, ${d.getDate()} ${MON_NL[d.getMonth()]}`;
  if (h >= 6 && h < 12) return { text: "Goedemorgen", sub: "Rustig aan, stap voor stap.", gradient: "linear-gradient(160deg,#F7EDD0 0%,#ECE6D5 55%,#E5DED1 100%)", date };
  if (h >= 12 && h < 17) return { text: "Goedemiddag", sub: "Een taak per keer.", gradient: "linear-gradient(160deg,#D5E8CE 0%,#E5EAD8 55%,#E4DDD0 100%)", date };
  if (h >= 17 && h < 21) return { text: "Goedenavond", sub: "Fijn dat je er bent.", gradient: "linear-gradient(160deg,#F2DDCA 0%,#EBE0D0 55%,#E4DDD0 100%)", date };
  return { text: "Goedenacht", sub: "Stil in huis.", gradient: "linear-gradient(160deg,#D0D8EC 0%,#DDD8E4 55%,#E4DDD0 100%)", date };
}

export function intervalLabel(days: number): string {
  if (days === 1) return "Dagelijks";
  if (days === 2) return "Om de dag";
  if (days === 7) return "Wekelijks";
  if (days === 14) return "Elke 2 weken";
  if (days === 30) return "Maandelijks";
  return `Elke ${days} dagen`;
}
