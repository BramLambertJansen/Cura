# Bijdragen aan Cura

Fijn dat je meewerkt aan Cura. Deze pagina bundelt de werkafspraken op één plek. De inhoudelijke bron van waarheid — architectuur, conventies, anti-patronen, feature-map — blijft [`CLAUDE.md`](./CLAUDE.md); voor installeren en draaien zie [`README.md`](./README.md).

## Voordat je begint

1. Lees bij twijfel over toon of gedrag eerst [`CLAUDE.md`](./CLAUDE.md) (§1 pijlers, §2 anti-patronen) en de design brief in `src/imports/pasted_text/cura-design-brief.md`.
2. Werk standaard in `local` data mode (`VITE_DATA_MODE=local`) — snel en zonder backend. Zet alleen `cloud` op als je expliciet auth, invites, RLS of realtime test.

## Branch & commit

- Werk op een feature-branch, niet direct op de standaard-branch.
- Houd commits klein en beschrijvend; beschrijf het *waarom*, niet alleen het *wat*.
- User-facing copy en Nederlandse domeinnamen (Vandaag, Huis, Routines, kamer, taak) blijven Nederlands; domeincode (schemas, store, selectors) is Engels — volg de bestaande bestanden (`CLAUDE.md` §8).

## Klaar = getest én toegankelijk

Een wijziging is pas "klaar" als:

- **Toegankelijk** — voldoet aan de a11y-eisen in [`CLAUDE.md` §6](./CLAUDE.md) (semantische HTML, toetsenbordbediening + zichtbare focus, `alt`/`aria-label`, WCAG AA-contrast, aangekondigde dynamische updates).
- **Component-based** — samengesteld uit bestaande herbruikbare componenten in plaats van ad-hoc inline stijl; nieuwe bouwstenen staan ook op de design-system-pagina ([`CLAUDE.md` §7](./CLAUDE.md)).
- **Data-laag netjes** — nieuwe persisted velden beginnen in `src/data/schemas.ts`, krijgen een type in `types.ts` en bereiken schermen via een view-model + selector; feature-code leest nooit ruwe entities of `localStorage`/Supabase direct.

## Validatie vóór een PR

Run minimaal:

```bash
pnpm typecheck
pnpm test
pnpm build
```

- `pnpm typecheck` (app + service worker) is **verplicht** bij elke data-layer wijziging (`CLAUDE.md` §8).
- `pnpm test` (`vitest run`) dekt pure domeinlogica (selectors, reminders, schema's), de store/datalaag, en een dunne laag hook- en pagina-smoketests. Raakt je wijziging een selector, de store of een van de geteste schermen, voeg dan een test toe in dezelfde PR.
- Bij UI-wijzigingen: doe een lokale visuele check in de browser; bij merkbare webapp-wijzigingen hoort ook een screenshot in de werkcontext.

Er is nog geen lint-script of CI-workflow-bestand in deze repo; typecheck, test en build zijn de poort en je draait ze zelf. Voeg je linting/CI toe, werk dan `CLAUDE.md` §9 en `README.md` bij.

## Documentatie bijwerken

Docs horen bij de code — werk ze in dezelfde PR bij:

- Feature toegevoegd/verwijderd/van fase veranderd → werk de feature-map in [`CLAUDE.md` §5](./CLAUDE.md) én de phasing-tabel in §4 bij. **Verwijder je iets, haal het dan ook echt uit de docs** — een beschrijving van een component dat niet meer bestaat kost een volgende lezer meer tijd dan een ontbrekende regel.
- Scripts, setup, env of stack gewijzigd → werk `CLAUDE.md` §9/§10 en `README.md` bij.
- Nieuw herbruikbaar component → voeg het toe aan de design-system-pagina (`CLAUDE.md` §7) én aan de inventaris in diezelfde sectie.
- Nieuwe SQL-migratie → noem 'm in de sectie van de feature waar hij bij hoort (`CLAUDE.md` §4/§5) en onthoud dat hij op productie handmatig gedraaid moet worden (`README.md` → Live zetten).

## Pull requests

Volg de PR-template (`.github/pull_request_template.md`): beschrijf wat er verandert en waarom, en vink de validatie- en a11y-checklist af.
