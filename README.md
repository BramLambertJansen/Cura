# Cura

Cura is een rustige, gedeelde huishoudplanner voor twee mensen. De app helpt bij de mentale last van "wie doet wat en wanneer" zonder scorebord, harde streaks of rode achterstallig-waarschuwingen.

De UI-taal is Nederlands en de toon is warm, vergevingsgezind en praktisch: liever "waarschijnlijk weer toe" dan exacte druk of schuldgevoel. Meer product- en ontwerpcontext staat in [`CLAUDE.md`](./CLAUDE.md) en [`src/imports/pasted_text/cura-design-brief.md`](./src/imports/pasted_text/cura-design-brief.md).

## Wat zit erin?

- **Vandaag** — de planner-thuisbasis voor wat je nu gaat doen, als dagdeel-tijdlijn (ochtend/middag/avond).
- **Huis** — een gedeelde pool van taken per kamer.
- **Routines** — terugkerende bundels met zachte dichtheid-feedback in plaats van streaks, inclusief een volledig-scherm "routine starten"-sessie.
- **Samen** — zichtbaarheid rond wat er in huis al is gedaan, bereikbaar via Meer en via een preview-kaart op Vandaag.
- **Meer** — de plek voor alles zonder eigen tab: Samen, Focustimer, Takenoverzicht, Boodschappen, huishouden beheren en account beheren.
- **Boodschappen** — gedeelde lijst met categorieën, aantallen/eenheden en snel-toevoegen-snelkoppelingen.
- **Focustimer** — zachte pomodoro-achtige timer, vrij of vanaf een taak.
- **Wekkers & push** — taakherinneringen in de app, en echte Web Push (cloud mode) als de app dicht is, met stille uren per persoon.
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
- [Live zetten (productie)](#live-zetten-productie)
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
| `VITE_VAPID_PUBLIC_KEY` | Cloud mode, push | Publieke VAPID-key voor web push (wekkers als de app dicht is); server-secrets (`VAPID_KEYS`, `CRON_SECRET`) staan niet hier maar in Supabase secrets — zie `CLAUDE.md` §5 Push-notificaties. |

Keys zonder `VITE_` blijven server-side en mogen niet naar de client worden gelekt.

## Scripts

| Command | Doel |
| --- | --- |
| `pnpm dev` | Start de Vite dev server. |
| `pnpm build` | Maakt een productie-build inclusief PWA-assets/service worker. |
| `pnpm preview` | Serveert de productie-build lokaal. |
| `pnpm typecheck` | Draait `tsc --noEmit` (app) én `tsc --noEmit -p tsconfig.worker.json` (service worker). |
| `pnpm test` | Draait Vitest (`vitest run`): pure domeinlogica, hook-tests en pagina-smoketests. |
| `pnpm test:coverage` | Draait dezelfde tests met een v8-coveragerapport (nog geen thresholds). |

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
3. Pas de SQL-migraties uit `supabase/migrations/` toe op het project, in bestandsnaam-volgorde.
4. Controleer dat Realtime-publications zijn ingericht voor de tabellen die de app live wil verversen (`tasks`, `rooms`, `bundles`, `members`, `shopping_items`, `task_completions`) — zonder de `supabase_realtime`-publicatie vuurt `postgres_changes` nooit.
5. Zet de redirect-URL's van je omgeving in de Auth-instellingen van het project, inclusief de `/**`-wildcardvorm — magic links en bevestigingsmails sturen terug naar het volledige pad, niet naar de root (zie de toelichting in `supabase/config.toml`).
6. Start de app opnieuw met `pnpm dev`.

Gebruik `local` mode voor snel product- en UI-werk wanneer Supabase niet nodig is.

## Live zetten (productie)

Cura draait in productie op Vercel (`vercel.json` regelt rewrites + CSP-headers) met `VITE_DATA_MODE=cloud`, gekoppeld aan de GitHub-repo zodat een merge naar `main` automatisch een nieuwe productie-deploy triggert. Er is geen apart CI-workflow-bestand — de build/typecheck/test-stap loopt via Vercel's eigen buildstap plus de handmatige validatie hierboven.

> **Let op bij nieuwe externe hosts.** De CSP in `vercel.json` staat strak: `script-src 'self'`, `img-src 'self' data:`, `connect-src 'self' https://*.supabase.co wss://*.supabase.co`, fonts alleen van Google Fonts. Voeg je een analytics-script, CDN, of andere API toe, zet die host er dan expliciet bij — anders blokkeert de browser 'm stil in productie terwijl lokaal alles werkt.

**1. Client-env in Vercel** — zet dezelfde `VITE_`-variabelen als in [Omgevingsvariabelen](#omgevingsvariabelen) in het Vercel-project (Project Settings → Environment Variables), gericht op het productie-Supabase-project:

```env
VITE_DATA_MODE=cloud
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_VAPID_PUBLIC_KEY=...
```

**2. Server-secrets op Supabase** — deze horen nooit in Vercel of `.env`, alleen op het Supabase-project zelf via `supabase secrets set` (`VAPID_KEYS`, optioneel `VAPID_CONTACT`, `CRON_SECRET`) plus de Vault-secrets die de reminder-cron-migratie verwacht (`cura_cron_secret`, `cura_functions_base_url`). Volledige uitleg en de exacte commands staan in [`CLAUDE.md` §5, Push-notificaties](./CLAUDE.md).

**3. Database in sync houden** — migraties in `supabase/migrations/` worden **niet automatisch toegepast**; elke nieuwe migratie moet je zelf via de Supabase Dashboard SQL-editor draaien op het productieproject nadat de PR gemerged is. Controleer na elke merge die een nieuw bestand in `supabase/migrations/` bevat of die stap ook echt is gebeurd — een migratie die alleen in de repo staat heeft in productie geen effect. Controleer daarbij ook dat de betrokken tabellen in de `supabase_realtime`-publicatie zitten als de migratie een nieuwe tabel toevoegt die live moet verversen (§3/§4 in `CLAUDE.md`).

Omdat migraties handmatig gaan, is er ook geen `supabase_migrations`-tabel die bijhoudt wat er al gedraaid heeft. Gebruik daarvoor **[`supabase/check_migrations.sql`](./supabase/check_migrations.sql)**: plak dat bestand in de SQL-editor en draai het (read-only). Je krijgt één rij per migratie met `OK` of `ONTBREEKT` plus welk object er precies mist, zodat je gericht alleen de ontbrekende migratiebestanden hoeft na te draaien — in bestandsnaam-volgorde. Werk dat script bij zodra je een migratie toevoegt.

**4. Na een deploy** — een snelle rooktest: inloggen, een taak aanmaken/afvinken, en (in cloud mode) controleren dat Realtime tussen twee sessies werkt en dat een testmelding via de wekker-flow aankomt.

## Werken aan de app

Een praktische volgorde voor wijzigingen:

1. Lees bij UX- of copy-twijfel eerst `CLAUDE.md` en de design brief.
2. Kies `local` mode tenzij je expliciet auth, invites, RLS of realtime test.
3. Houd nieuwe UI component-based: herbruikbare bouwstenen horen in `src/app/components/`; feature-specifieke schermen in `src/app/features/<naam>/`.
4. Voeg nieuwe persisted velden eerst toe aan schema/types/store en leid UI-staat daarna af via selectors.
5. Werk README/CLAUDE bij als je gedrag, scripts, setup of fase-status verandert — zie [`CONTRIBUTING.md`](./CONTRIBUTING.md) voor de volledige workflow en pre-PR-validatie.

## Teststrategie

De tests draaien in drie lagen, alle drie via `pnpm test`:

1. **Pure domeinlogica** (`environment: 'node'`, de meerderheid) — `src/data/selectors.ts` (done-state voor eenmalige en terugkerende taken, zachte due-hints, routine-dichtheid zonder streak-mechaniek, sortering van de Samen-feed, dagdeel-groepering, boodschappen-categorieën), `src/data/reminders.ts` (reminder-triggers, tijdzone-gedrag, stille uren, plus een guard dat de edge-function-kopie byte-identiek blijft), de zod-schema's en losse helpers.
2. **Store- en datalaag-tests** — `useCuraStore` met een gemockte `DataStore`, plus `LocalStore`/`SupabaseStore` rechtstreeks (o.a. de "kolom bestaat nog niet"-retry en het overslaan van corrupte rijen).
3. **Hook- en pagina-smoketests** — `@testing-library/react` + jsdom, per bestand opt-in via een `// @vitest-environment jsdom`-docblock zodat laag 1 snel blijft.

Er is op dit moment nog geen lint-script of CI-workflow-bestand in deze repo; typecheck, test en build zijn de handmatige poort vóór een PR.

## Productprincipes

Cura blijft kalm en niet-competitief: geen scoreborden, harde streaks, totaalpercentages, rode achterstallig-statussen of verplichte taaktoewijzing. Kies bij twijfel voor zachte taal, herstelbare acties en rustige feedback.

De volledige lijst anti-patronen (met het waarom en de zachte alternatieven) staat in [`CLAUDE.md` §2](./CLAUDE.md).
