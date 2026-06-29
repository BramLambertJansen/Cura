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

## 5. Conventions

- Domain code (schemas, store interface, selectors) is in English; user-facing copy and Dutch domain nouns (Vandaag, Huis, Routines, Samen, kamer, taak) stay Dutch — match the existing files.
- New screens/components go under `src/app/features/<naam>/`; shared UI in `src/app/components/`; shadcn primitives in `src/app/components/ui/` (don't hand-edit generated shadcn internals beyond what's needed — regenerate via shadcn conventions if a primitive needs real changes).
- Any new persisted field starts in `src/data/schemas.ts`, gets a domain type via inference in `types.ts`, and is exposed to screens through a view-model + selector — never read raw entities in a feature component.
- Run `pnpm typecheck` before considering a data-layer change done.

## 6. Stack

React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (Radix), Zustand, Zod, react-router, motion (Framer Motion), Supabase (Phase 3+), vite-plugin-pwa. Package manager is `pnpm`.
