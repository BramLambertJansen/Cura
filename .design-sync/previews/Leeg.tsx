import { Leeg } from 'cura';

// Gentle empty state — an emoji glyph over a soft italic line, inside standard
// card chrome. (The illustrated `image` variant needs app assets that don't
// load in this sandbox, so the icon+text form is shown.)
export function GeenTaken() {
  return <Leeg icon="🌿" text="Nog geen taken voor vandaag. Geniet even van de rust." />;
}

export function AllesGedaan() {
  return <Leeg icon="✨" text="Alles gedaan voor vandaag. Mooi werk samen!" />;
}
