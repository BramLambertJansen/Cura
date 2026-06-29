# Cura

Een rustige, gedeelde huishoudplanner voor twee mensen. Geen schoonmaak-tracker, geen productiviteits-app met scoreborden — een plek die de mentale last van "wie doet wat en wanneer" wegneemt.

De UI/UX is gedesigned in Figma (via Make), op basis van het wireframe-brief in `src/imports/pasted_text/cura-design-brief.md`. De app is daarna herbouwd op een echte data-laag (Zustand + zod-schema's, lokaal of Supabase) terwijl het Figma-ontwerp leidend blijft.

## 1. De drie pijlers

1. **Vandaag** — planner-thuisbasis. "Wat ga ik nu doen." Kort, actiegericht.
2. **Routines** — terugkerende structuur + bundels van taken ("ochtendroutine"). Hier leeft de gewoontevorming.
3. **Samen** — zichtbaarheid. Een afgevinkte taak is een *bericht* ("ik heb de keuken al gedaan"), geen logboek of scorebord.

Plus **Huis**: de gedeelde pool van taken, georganiseerd per kamer.

**Toon:** kalm, warm, vergevingsgezind. Eerlijkheid boven precisie — liever "badkamer is waarschijnlijk weer toe" dan een hard getal of tijdstip. UI-taal is Nederlands.

Volledige ontwerpprincipes, schermen en microcopy-richtlijnen staan in `src/imports/pasted_text/cura-design-brief.md` — lees dat bij twijfel over toon of gedrag, niet alleen deze file.

## 2. Anti-patronen — nooit toevoegen

- Geen vaag samenvattend percentage ("Home peace 78%").
- Geen harde streaks ("12 dagen op rij!", "streak verbroken"). Gebruik ratio-over-venster ("11 van de 14 ochtenden").
- Geen wie-doet-meer-scoreborden of persoon-vs-persoon-vergelijkingen.
- Geen exacte "laatst gedaan om 8:30"-claims als ruggengraat — zachte interval-hints.
- Geen verplichte toewijzing van taken. Pool eerst, claim ("ik pak dit") is optioneel en omkeerbaar.
- Geen alarmerende lege staten of rode "achterstallig"-waarschuwingen.

## 3. Architectuur

```
src/
  app/            UI: pages (features/), sheets, layout, shared components, shadcn ui/
  data/           domain schemas (zod), types, the DataStore interface, selectors
    local/        LocalStore — localStorage backend (Phase 1-2)
    cloud/        SupabaseStore — Supabase backend (Phase 3+)
  stores/         useCuraStore — the one Zustand store feature code touches
```

**Data flow:** Feature code never imports `localStorage` or Supabase directly. It calls `useCuraStore`, which owns a `DataStore` instance (`src/data/store.ts`) selected by `VITE_DATA_MODE` (`local` or `cloud`). The store holds normalized **domain entities** in memory; screens render **view-models** (`TaskView`, `RoomView`, `RoutineView`, `ActivityView` in `src/data/types.ts`) produced by `src/data/selectors.ts`.

This split is deliberate: domain schemas (`src/data/schemas.ts`) store no derived state — no `done`, no density ratios, no hint text. Everything a screen needs that looks computed (a task's done/doneBy, a room's "waarschijnlijk weer toe" hint, a routine's "11 of 14") is derived by selectors from entities + completions. That's what lets the app degrade gracefully with partial data and keeps the local/cloud swap a backend change, not a feature rewrite.

**One-household cap:** `getHouseholdsForUser` always returns a list, even though it's length 1 today. The "one household per user" rule is enforced in `acceptInvite` (app layer), not as a data-shape assumption — removing the cap later is a one-line change, not a migration.

**Completions are the event layer.** `completeTask` writes an event; `done`, the Samen feed, and routine density all derive from completions, not from a stored boolean. `uncompleteTask` removes the most recent one — no penalty, no "broken streak".

## 4. Phasing

| Phase | Scope | Status |
|---|---|---|
| 1 | Vandaag, Huis, taak toevoegen — solo, `local` data mode | Built |
| 2 | Routines + dichtheid-feedback | Built |
| 3 | Samen, onboarding/invite-flow, `cloud` data mode (Supabase auth/RLS/realtime) | In progress — see `.mcp.json` / Supabase MCP |
| 4 | AI-invoer (natuurlijke taal bij toevoegen/aanpassen) | Not started |

Phase 1–2 work with zero backend (`VITE_DATA_MODE=local`, seeded via `src/data/local/seed.ts`). Switching to `VITE_DATA_MODE=cloud` swaps in `SupabaseStore` without touching feature code.

## 5. Features

Houd deze lijst bij wanneer je een feature toevoegt, verwijdert, of van fase verandert — dit is de bron van waarheid voor "wat zit erin", niet alleen de phasing-tabel in §4.

- **Vandaag** (`src/app/features/vandaag/VandaagPage.tsx`) — geplande taken van vandaag, afvinken, routines-van-vandaag, zacht zichtbaarheidsstrookje.
- **Huis** (`src/app/features/huis/HuisPage.tsx`) — kamer-kaarten met interval-hint, kamer-detail als pool-lijst, claim-actie ("ik pak dit"), kamer toevoegen/bewerken (`NewRoomSheet`, `EditRoomSheet`).
- **Routines** (`src/app/features/routines/RoutinesPage.tsx`) — bundels van taken, dichtheid-feedback (ratio-over-venster), routine toevoegen/bewerken (`NewRoutineSheet`, `EditRoutineSheet`, `IntervalKiezer`).
- **Samen** (`src/app/features/samen/SamenPage.tsx`) — chronologische "vandaag in huis"-feed, huishouden-instellingen-ingang (`HouseholdSheet`).
- **Taak toevoegen** (`AddTaskSheet`) — FAB-flow, één invoerveld + inklapbare opties, belandt standaard in de pool.
- **Profiel** (`ProfielSheet`) — eigen weergavenaam/instellingen.
- Nog niet gebouwd: onboarding/invite-flow en cloud-auth (Phase 3, zie §4), AI-invoer (Phase 4).

## 6. Toegankelijkheid (A11Y) — verplicht

Elke nieuwe of gewijzigde UI moet toegankelijk zijn, niet als nazorg maar als onderdeel van "klaar":

- Semantische HTML eerst (`button`, `nav`, `label`, koppen in volgorde) vóór `div` + ARIA.
- Interactieve elementen (checkbox, claim-actie, FAB, sheets) zijn met toetsenbord bedienbaar en hebben een zichtbare focus-state.
- Afbeeldingen en iconen-only-knoppen hebben `alt`/`aria-label`; decoratieve iconen krijgen `aria-hidden`.
- Kleurcontrast volgt WCAG AA — het sage/crème-palet mag niet onder de drempel zakken, test bij het kiezen van nieuwe tinten.
- Dynamische updates (afvinken, claimen, toasts) zijn aangekondigd voor screenreaders (bv. `aria-live` op de Sonner-toasts, status op de checkbox).
- shadcn/Radix-primitives in `src/app/components/ui/` zijn toegankelijk by default — bouw daarop voort in plaats van eigen ARIA-loze varianten te schrijven.

## 7. Component-based werken & design system

We bouwen component-based: nieuwe UI is samengesteld uit herbruikbare, uniforme componenten — geen ad-hoc gestylede markup direct in een feature-pagina.

- Herbruikbare bouwstenen horen in `src/app/components/` (eigen Cura-componenten zoals `KamerKaart`, `RoutineKaart`, `TaakRij`, `GroupCard`) of `src/app/components/ui/` (shadcn-primitives). Feature-pagina's componeren deze, ze herdefiniëren geen eigen knop/kaart/badge-stijl inline.
- Er is een **design system-pagina** op `/dev/design-system` (`src/app/features/design-system/DesignSystemPage.tsx`) — geen tab, geen route in `BottomNav` (blijft op 4 zichtbare tabs), alleen direct via URL. Toont elk uniform component (knoppen, kaarten, badges, inputs, checkboxen, kleuren/schaduwen/gradient-tokens) met states en varianten op één plek. Nieuw herbruikbaar component? Voeg het hier ook toe.
- Tokens (kleur, radius, schaduw, spacing) horen in `src/styles/theme.css` / Tailwind config, niet hardcoded in componenten. Afgeleide waarden (tints, schaduwen, gradients) wijzen via `color-mix(in srgb, var(--token) X%, transparent)` terug naar een basistoken in plaats van een eigen rgba-tripel te dupliceren — verander je `--primary` of `--shadow-color` in theme.css, dan volgt elk component dat ernaar verwijst automatisch. Voor kleuren die Framer Motion moet animeren (`animate={{ backgroundColor: ... }}`) kan dat geen losse `var()`-string zijn — die worden in `src/app/lib/constants.tsx` één keer via `cssVar()` opgelezen uit hun CSS-token (zie `SAGE`, `MUTED_FG`, `DESTRUCTIVE`), zodat ook die nog steeds van het token afhangen in plaats van een eigen hex te hardcoden.
- Nieuwe visuele varianten gaan eerst als variant/prop op een bestaand component (cva-variants, zoals in `button.tsx`), niet als losse component met bijna-dezelfde stijl.

## 8. Conventions

- Domain code (schemas, store interface, selectors) is in English; user-facing copy and Dutch domain nouns (Vandaag, Huis, Routines, Samen, kamer, taak) stay Dutch — match the existing files.
- New screens/components go under `src/app/features/<naam>/`; shared UI in `src/app/components/`; shadcn primitives in `src/app/components/ui/` (don't hand-edit generated shadcn internals beyond what's needed — regenerate via shadcn conventions if a primitive needs real changes).
- Any new persisted field starts in `src/data/schemas.ts`, gets a domain type via inference in `types.ts`, and is exposed to screens through a view-model + selector — never read raw entities in a feature component.
- Run `pnpm typecheck` before considering a data-layer change done.

## 9. Devstraat

- `pnpm dev` — Vite dev server. `pnpm build` — productie-build (ook PWA-manifest/service worker via `vite-plugin-pwa`). `pnpm preview` — preview van de build. `pnpm typecheck` — `tsc --noEmit`, verplicht vóór elke data-layer wijziging (zie §8).
- Er is nog **geen lint-script, testrunner of CI-workflow** in deze repo — alleen typecheck is geautomatiseerd. Voeg je linting/tests/CI toe, werk deze sectie dan bij zodat dit overzicht klopt.
- Omgevingsvariabelen staan in `.env.example` (`VITE_DATA_MODE`, Supabase-keys voor Phase 3+, VAPID-key voor push, AI-keys voor Phase 4 — die laatste twee blijven server-side, nooit `VITE_`-geprefixt).

## 10. Stack

React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (Radix), Zustand, Zod, react-router, motion (Framer Motion), Supabase (Phase 3+), vite-plugin-pwa. Package manager is `pnpm`.
