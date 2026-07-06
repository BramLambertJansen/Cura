# Cura

Cura is een rustige, gedeelde huishoudplanner voor twee mensen. De app helpt bij de mentale last van "wie doet wat en wanneer" zonder scorebord, harde streaks of rode achterstallig-waarschuwingen.

De UI-taal is Nederlands en de toon is warm, vergevingsgezind en praktisch: liever "waarschijnlijk weer toe" dan exacte druk of schuldgevoel. Meer product- en ontwerpcontext staat in [`CLAUDE.md`](./CLAUDE.md) en [`src/imports/pasted_text/cura-design-brief.md`](./src/imports/pasted_text/cura-design-brief.md).

## Wat zit erin?

- **Vandaag** — de planner-thuisbasis voor wat je nu gaat doen.
- **Huis** — een gedeelde pool van taken per kamer.
- **Routines** — terugkerende bundels met zachte dichtheid-feedback in plaats van streaks.
- **Samen** — zichtbaarheid rond wat er in huis al is gedaan, bereikbaar via Meer.
- **Meer** — secundaire acties zoals Samen, huishouden beheren en account beheren.
- **PWA-platform** — vaste app-shell, safe-area-aware layout, offline/update-UX en app-icon/splash-assets.
- **Data modes** — lokaal via `localStorage` of cloud via Supabase.

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4
- shadcn/ui + Radix primitives
- Zustand + Zod
- React Router
- Motion
- Supabase voor cloud mode
- Vitest voor unit tests
- vite-plugin-pwa voor PWA-builds

Package manager: **pnpm**. Gebruik geen gemengde lockfiles; `pnpm-lock.yaml` is leidend.

## Vereisten

- Node.js 20 of nieuwer
- pnpm 9 of nieuwer
- Optioneel: een Supabase-project voor `VITE_DATA_MODE=cloud`

## Inhoud

- [Wat zit erin?](#wat-zit-erin)
- [Stack](#stack)
- [Snel starten](#snel-starten)
- [Omgevingsvariabelen](#omgevingsvariabelen)
- [Scripts](#scripts)
- [Projectstructuur](#projectstructuur)
- [Architectuur in het kort](#architectuur-in-het-kort)
- [Data modes](#data-modes)
- [Supabase-notities](#supabase-notities)
- [Werken aan de app](#werken-aan-de-app)
- [Teststrategie](#teststrategie)
- [Productprincipes](#productprincipes)

## Snel starten

```bash
pnpm install
cp .env.example .env
pnpm dev
```

De dev server draait daarna via Vite. Open de URL die in de terminal verschijnt.

Standaard gebruikt `.env.example` lokale data:

```env
VITE_DATA_MODE=local
```

Daarmee werkt de app zonder backend en gebruikt hij `localStorage`.

## Omgevingsvariabelen

| Variabele | Nodig voor | Beschrijving |
| --- | --- | --- |
| `VITE_DATA_MODE` | Altijd | `local` voor localStorage of `cloud` voor Supabase. |
| `VITE_SUPABASE_URL` | Cloud mode | Supabase project-URL. |
| `VITE_SUPABASE_ANON_KEY` | Cloud mode | Supabase anon/public key. |
| `VITE_VAPID_PUBLIC_KEY` | Toekomstige push-flow | Publieke VAPID-key voor web push. |

Keys zonder `VITE_` blijven server-side en mogen niet naar de client worden gelekt.

## Scripts

| Command | Doel |
| --- | --- |
| `pnpm dev` | Start de Vite dev server. |
| `pnpm build` | Maakt een productie-build inclusief PWA-assets/service worker. |
| `pnpm preview` | Serveert de productie-build lokaal. |
| `pnpm typecheck` | Draait `tsc --noEmit`. |
| `pnpm test` | Draait Vitest unit tests. |

## Standaard validatie vóór een PR

Run minimaal:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Bij data-layer wijzigingen is `pnpm typecheck` verplicht. Bij UI-wijzigingen is een lokale visuele check in de browser aanbevolen; bij merkbare webapp-wijzigingen hoort ook een screenshot in de werkcontext.

## Projectstructuur

```text
src/
  app/      UI: routes, features, sheets, layout en gedeelde componenten
  data/     schema's, types, store-interface, selectors en lokale/cloud stores
  stores/   Zustand store die feature-code gebruikt
  styles/   globale styles, fonts, Tailwind en design tokens
supabase/   lokale Supabase-configuratie en SQL-migraties
public/     logo, achtergrond en PWA-assets
```

Belangrijke conventies:

- Feature-code gebruikt `useCuraStore` en importeert Supabase/localStorage niet direct.
- Persisted domeinvelden beginnen in `src/data/schemas.ts` en lopen via types/selectors naar view-models.
- User-facing copy is Nederlands.
- Domain code is overwegend Engels.
- Nieuwe top-level functionaliteit die geen hoofdtab verdient, hoort onder **Meer** in plaats van als vijfde bottom-nav tab.

## Architectuur in het kort

Cura scheidt UI, domeinlogica en opslag bewust van elkaar: feature-code leest en schrijft via `useCuraStore`, die op basis van `VITE_DATA_MODE` de lokale of cloud store kiest. Persisted entities blijven vlak; afgeleide staat (`done`, hints, feed-items, routine-dichtheid) komt uit selectors en screens renderen view-models. Daardoor draait dezelfde UI op lokale seed-data of Supabase zonder backend-specifieke code in feature-componenten.

Het volledige verhaal — data flow, one-household cap, completions als event-laag, de app-shell/PWA-laag — staat in [`CLAUDE.md` §3](./CLAUDE.md).

## Data modes

### Local mode

```env
VITE_DATA_MODE=local
```

Gebruikt `localStorage` en seed-data. Dit is de snelste route voor frontend- en productwerk zonder backend.

### Cloud mode

```env
VITE_DATA_MODE=cloud
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Cloud mode gebruikt Supabase Auth, RLS, Realtime en de SQL-migraties in `supabase/migrations/`. Raadpleeg `CLAUDE.md` voor de actuele Phase 3-notities rond households, invites, realtime-publications en RPC's.

## Supabase-notities

Voor cloud mode is alleen het invullen van `.env` niet genoeg: de database moet ook de migraties en policies hebben die bij de app horen. In grote lijnen:

1. Maak of kies een Supabase-project.
2. Zet `VITE_DATA_MODE=cloud`, `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` in `.env`.
3. Pas de SQL-migraties uit `supabase/migrations/` toe op het project.
4. Controleer dat Realtime-publications zijn ingericht voor de tabellen die de app live wil verversen.
5. Start de app opnieuw met `pnpm dev`.

Gebruik `local` mode voor snel product- en UI-werk wanneer Supabase niet nodig is.

## Werken aan de app

Een praktische volgorde voor wijzigingen:

1. Lees bij UX- of copy-twijfel eerst `CLAUDE.md` en de design brief.
2. Kies `local` mode tenzij je expliciet auth, invites, RLS of realtime test.
3. Houd nieuwe UI component-based: herbruikbare bouwstenen horen in `src/app/components/`; feature-specifieke schermen in `src/app/features/<naam>/`.
4. Voeg nieuwe persisted velden eerst toe aan schema/types/store en leid UI-staat daarna af via selectors.
5. Werk README/CLAUDE bij als je gedrag, scripts, setup of fase-status verandert — zie [`CONTRIBUTING.md`](./CONTRIBUTING.md) voor de volledige workflow en pre-PR-validatie.

## Teststrategie

De huidige unit tests richten zich op pure domeinlogica in `src/data/selectors.ts`, waaronder:

- done-state voor eenmalige en terugkerende taken;
- zachte due-hints;
- routine-dichtheid zonder streak-mechaniek;
- sortering van de Samen-activity feed;
- reminder-triggerlogica.

Er is op dit moment nog geen lint-script of CI-workflow in deze repo.

## Productprincipes

Cura blijft kalm en niet-competitief: geen scoreborden, harde streaks, totaalpercentages, rode achterstallig-statussen of verplichte taaktoewijzing. Kies bij twijfel voor zachte taal, herstelbare acties en rustige feedback.

De volledige lijst anti-patronen (met het waarom en de zachte alternatieven) staat in [`CLAUDE.md` §2](./CLAUDE.md).
