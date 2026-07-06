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

- `pnpm typecheck` (`tsc --noEmit`) is **verplicht** bij elke data-layer wijziging (`CLAUDE.md` §8).
- `pnpm test` (`vitest run`) dekt de pure domeinlogica in `src/data/selectors.ts`.
- Bij UI-wijzigingen: doe een lokale visuele check in de browser; bij merkbare webapp-wijzigingen hoort ook een screenshot in de werkcontext.

Er is nog geen lint-script of CI-workflow in deze repo; typecheck en test zijn de geautomatiseerde poort. Voeg je linting/CI toe, werk dan `CLAUDE.md` §9 en `README.md` bij.

## Documentatie bijwerken

Docs horen bij de code — werk ze in dezelfde PR bij:

- Feature toegevoegd/verwijderd/van fase veranderd → werk de feature-map in [`CLAUDE.md` §5](./CLAUDE.md) én de phasing-tabel in §4 bij.
- Scripts, setup, env of stack gewijzigd → werk `CLAUDE.md` §9/§10 en `README.md` bij.
- Nieuw herbruikbaar component → voeg het toe aan de design-system-pagina (`CLAUDE.md` §7).

## Pull requests

Volg de PR-template (`.github/pull_request_template.md`): beschrijf wat er verandert en waarom, en vink de validatie- en a11y-checklist af.
