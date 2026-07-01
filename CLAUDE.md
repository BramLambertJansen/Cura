# Cura

Een rustige, gedeelde huishoudplanner voor twee mensen. Geen schoonmaak-tracker, geen productiviteits-app met scoreborden — een plek die de mentale last van "wie doet wat en wanneer" wegneemt.

De UI/UX is gedesigned in Figma (via Make), op basis van het wireframe-brief in `src/imports/pasted_text/cura-design-brief.md`. De app is daarna herbouwd op een echte data-laag (Zustand + zod-schema's, lokaal of Supabase) terwijl het Figma-ontwerp leidend blijft.

## 1. De drie pijlers

1. **Vandaag** — planner-thuisbasis. "Wat ga ik nu doen." Kort, actiegericht.
2. **Routines** — terugkerende structuur + bundels van taken ("ochtendroutine"). Hier leeft de gewoontevorming.
3. **Samen** — zichtbaarheid. Een afgevinkte taak is een *bericht* ("ik heb de keuken al gedaan"), geen logboek of scorebord.

Plus **Huis**: de gedeelde pool van taken, georganiseerd per kamer.

**Navigatie:** de onderbalk (`BottomNav`) toont 4 tabs — Vandaag, Huis, Routines, **Meer**. Samen heeft geen eigen tab meer; het is, samen met Huishouden beheren en Account beheren, bereikbaar via de Meer-pagina (§5). Nieuwe schermen die geen eigen tab verdienen, horen als item op Meer, niet als 5e tab.

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

**App shell is a fixed, full-bleed PWA layer, not a scrolling document.** `index.html` locks `html`/`body` from scrolling; `MainShell` (`src/app/App.tsx`) is `fixed inset-0`, paints `AppBackground` (the splash-screen artwork, `public/background.png`) behind everything, and only the route content area scrolls. Layout reads `--safe-top/-bottom/-left/-right` (`env(safe-area-inset-*)`, defined in `theme.css`) instead of assuming `h-screen` is safe — applied in the shell, `BottomNav`, the shared `Sheet`, and the full-screen auth/invite/error pages. The shared `Sheet` (`src/app/components/shared.tsx`) is always height-capped and internally scrollable, nudges itself above the on-screen keyboard via `useKeyboardInset` (`src/app/lib/useKeyboardInset.ts`, for browsers that don't resize the layout viewport), and supports drag-to-dismiss from the handle plus Escape-to-close. `ErrorBoundary` (`src/app/components/ErrorBoundary.tsx`) wraps the router so a render-time crash shows a calm recovery screen instead of a blank white page — keep new top-level providers/imports that can throw synchronously (like a misconfigured Supabase client) defensive, since a module-evaluation-time throw happens before the boundary can catch it.

## 4. Phasing

| Phase | Scope | Status |
|---|---|---|
| 1 | Vandaag, Huis, taak toevoegen — solo, `local` data mode | Built |
| 2 | Routines + dichtheid-feedback | Built |
| 3 | Samen, onboarding/invite-flow, `cloud` data mode (Supabase auth/RLS + Realtime) | Built |
| 4 | AI-invoer (natuurlijke taal bij toevoegen/aanpassen) | Not started |

Phase 1–2 work with zero backend (`VITE_DATA_MODE=local`, seeded via `src/data/local/seed.ts`). Switching to `VITE_DATA_MODE=cloud` swaps in `SupabaseStore` without touching feature code.

**Phase 3 implementation notes:** schema + RLS live in `supabase/migrations/20260630000000_init.sql`, with household-rename/invite-hardening/index follow-ups in `20260630010000_household_rename_invite_hardening_indexes.sql`, the wekker/deadline column added in `20260630020000_task_due_date.sql` (`alter table public.tasks add column due_date timestamptz`), and the task description column added in `20260630040000_task_description.sql` (`alter table public.tasks add column description text`) — all apply manually via the Supabase Dashboard SQL editor. Email/password auth via `AuthProvider`/`AuthPage` (`signUp` reports back whether the project requires email confirmation, so the UI can show "check je mail" instead of hanging); "create your first household" onboarding via `CreateHouseholdPage`; invites are shareable links (`/uitnodiging/:token`, `AcceptInvitePage`), expire after 7 days, and are single-use/revocable, backed by the `accept_invite`/`create_household` Postgres RPCs, not typed codes. `SupabaseStore` (`src/data/cloud/supabaseStore.ts`) resolves `members.id` from the Supabase auth uid via a private `memberIdFor()` helper wherever it writes `completedById`/`claimedById`/`createdById`/`ownerId` — those columns reference `members.id`, never `auth.uid()` directly.

**Realtime (cloud mode only):** requires the tables added to the `supabase_realtime` publication (`20260630050000_realtime_publication.sql` — a separate, additional step from the RLS policies in `init.sql`; without it `postgres_changes` never fires). `SupabaseStore.subscribeToChanges(householdId, onChange)` opens one `postgres_changes` channel per household covering `tasks`/`rooms`/`bundles`/`members` (filtered server-side on `household_id`) and `task_completions` (no `household_id` column of its own — relies on the same RLS policy, `task_completions_select`, that gates normal reads, since Supabase's Realtime feed is RLS-aware for the authenticated session). `useCuraStore.init()` subscribes after the initial load and debounces `onChange` (`REALTIME_DEBOUNCE_MS` = 400ms in `src/stores/useCuraStore.ts`) into a single re-fetch of members/rooms/tasks/completions/bundles, so a burst of remote writes causes one refresh, not one per row; `reset()` tears the subscription down. `LocalStore.subscribeToChanges()` is a no-op returning an empty unsubscribe, so `local` mode is untouched and callers never branch on `store.mode`. Refetching (pure `SELECT`s) can't itself trigger new `postgres_changes` events, so there's no feedback loop by construction.

## 5. Features

Houd deze lijst bij wanneer je een feature toevoegt, verwijdert, of van fase verandert — dit is de bron van waarheid voor "wat zit erin", niet alleen de phasing-tabel in §4.

- **Vandaag** (`src/app/features/vandaag/VandaagPage.tsx`) — geplande taken van vandaag, afvinken, routines-van-vandaag, zacht zichtbaarheidsstrookje. Onder "Misschien handig vandaag": handmatige suggesties (geen AI) uit bestaande data — `toSuggestions` (`src/data/selectors.ts`) filtert open, niet-geplande taken met een zachte due-hint of wekker, kortste duur eerst. `SuggestieRij` (`src/app/components/SuggestieRij.tsx`) biedt "Zet op mijn dag" (zet `planned: true`) en "Niet vandaag" (client-only dagelijkse dismissal via `useNietVandaag`, `src/app/lib/useNietVandaag.ts` — geen domeinveld, morgen is de taak weer een kandidaat).
- **Huis** (`src/app/features/huis/HuisPage.tsx`) — kamer-kaarten met interval-hint, kamer-detail als pool-lijst, claim-actie ("ik pak dit"), kamer toevoegen/bewerken (`NewRoomSheet`, `EditRoomSheet`). Een lege kamer (nieuw of leeggemaakt) toont "Voeg snelle taken toe" i.p.v. de gewone lege staat; dat opent `TemplatesSheet` (`src/app/sheets/TemplatesSheet.tsx`), een statische templatebibliotheek per soort ruimte (`src/app/lib/templates.ts` — Keuken/Badkamer/Woonkamer/Slaapkamer/Toilet/Algemeen, 5-8 per categorie) met multi-select en batchtoevoegen via `createTasksFromTemplates` (bouwt op de bestaande `store.createTask`, één gebundelde state-update i.p.v. losse toasts per taak). Geopend via `useSheets().openTemplates`, net als de andere sheets gerenderd op `MainShell`-niveau (niet binnen de scrollende route-inhoud — die introduceert een eigen `position`-context waarin een `absolute` sheet achter de `BottomNav` zou belanden).
- **Routines** (`src/app/features/routines/RoutinesPage.tsx`) — bundels van taken, dichtheid-feedback (ratio-over-venster), routine toevoegen/bewerken (`NewRoutineSheet`, `EditRoutineSheet`, `IntervalKiezer`). Per routine-taak zijn duur en beschrijving optioneel instelbaar door de taak-rij uit te klappen (`TaakDraftRij`), naast de titel; zichtbaar als duur-badge + beschrijving-regel in de uitgeklapte `RoutineKaart`.
- **Samen** (`src/app/features/samen/SamenPage.tsx`) — chronologische "vandaag in huis"-feed. Geen eigen navigatietab meer; bereikbaar via de **Meer**-pagina. Zachte huishoudstatus-regel boven de feed (`householdStatusLine`, `src/app/lib/format.ts` — "Er is vandaag al wat lucht gemaakt" / "Rustige dag tot nu toe", nooit een telling). Elke activiteit heeft drie subtiele, omkeerbare reacties (`ActiviteitReacties`, `src/app/components/ActiviteitReacties.tsx`): "Bedank", "Mooi gedaan", "Ik pak de volgende" — client-only per dag (`useReacties`, `src/app/lib/useReacties.ts`, zelfde patroon als `useNietVandaag`), bewust geen nieuw domeinmodel/migratie voor zo'n kleine, persoonlijke micro-interactie. Geen punten, ranking of percentages per persoon.
- **Meer** (`src/app/features/meer/MeerPage.tsx`, route `/meer`) — vervangt de oude Samen-navigatietab (icoon: `MoreHorizontal`, drie puntjes). Lijstpagina met links naar dingen die niet standaard in `BottomNav` staan: Samen (navigeert naar `/samen`), Huishouden beheren (opent `HouseholdSheet` via `useSheets().openHousehold`), Account beheren (opent `ProfielSheet` via `useSheets().openProfiel`). Nieuwe niet-genavigeerde functionaliteit hoort hier, niet als losse tab.
- **Taak toevoegen** (`AddTaskSheet`) — FAB-flow, één invoerveld + inklapbare opties (kamer, herhalen, wekker, duur, beschrijving), belandt standaard in de pool.
- **Taak bewerken** (`EditTaskSheet`) — opent via tik op een taakrij (niet op de checkbox of claim-knop); laadt de taak op id, gedeeld formulier via `TaskFormFields`, verwijderen-met-bevestiging.
- **Wekker & duur op taken** — `dueDate` (ISO) op het `Task`-schema. Eenmalig = exacte deadline (datum+tijd); terugkerend = dagelijks tijdstip-deel. Badge (`wekkerLabel`) in `TaakRij`. Meldingen via de browser Notification API terwijl de app open is (`useTaskReminders` in `MainShell`, polling elke 30s via `getDueReminders` in `selectors.ts`); Sonner-toast als fallback. Echte push-notificaties (VAPID/service worker/edge function/pg_cron) zijn bewust uitgesteld.
- **Profiel** (`ProfielSheet`) — eigen weergavenaam/instellingen, meldingen-toggle (gekoppeld aan echte `Notification.permission` via `useNotificationPreference`), uitloggen.
- **Auth & onboarding** (`src/app/features/auth/`) — `AuthPage` (e-mail/wachtwoord login + registratie), `CreateHouseholdPage` ("noem je huishouden" voor een ingelogde gebruiker zonder huishouden). Gated in `App.tsx`'s `Gate`-component via `useAuth()`; in `local` mode resolved `AuthProvider` synchroon naar "ingelogd" (CLAUDE.md §4).
- **Uitnodigen** (`src/app/features/invite/AcceptInvitePage.tsx`, route `/uitnodiging/:token`) — deelbare link, geen typecode, vervalt na 7 dagen en is eenmalig bruikbaar; `HouseholdSheet` genereert/herroept de link via `createInvite`/`revokeInvite` en laat de huishoudnaam ook echt opslaan (`updateHousehold`).
- **App-shell & PWA-platform** — vast (`fixed`/`fixed inset-0`) app-shell met `AppBackground` (splash-achtergrond, §3), safe-area-aware layout, sleepbare/Escape-sluitbare `Sheet`, en `ErrorBoundary` voor een rustig herstelscherm bij crashes (§3). Eigen `Logo`-component (`src/app/components/Logo.tsx`, bron `public/logo.svg`) als favicon/app-icon/op auth-schermen. iOS "Add to Home Screen" toont eigen splash screens (`public/splash/*`, gelinkt in `index.html`).
- **Laden zonder "null"** (`src/app/components/Skeletons.tsx`) — `PageSkeleton`, `CardSkeleton`, `ListSkeleton` (rustige shimmer-kaarten, geen spinner) en `FullScreenSkeleton` (voor auth/store-init-gates). Gebruikt in `App.tsx`'s `Gate` (auth loading, store-init, route-`Suspense`) zodat er nooit een blanco scherm flitst; ook op de design system-pagina (§7).
- Nog niet gebouwd: AI-invoer (Phase 4).

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

- Herbruikbare bouwstenen horen in `src/app/components/` (eigen Cura-componenten zoals `KamerKaart`, `RoutineKaart`, `TaakRij`, `GroupCard`, `Logo`, `AppBackground`, `ErrorBoundary`, en de generieke `Card` in `shared.tsx` voor de standaard bg-card/rand/schaduw-kaart-chrome) of `src/app/components/ui/` (shadcn-primitives). Feature-pagina's componeren deze, ze herdefiniëren geen eigen knop/kaart/badge-stijl inline.
- Er is een **design system-pagina** op `/dev/design-system` (`src/app/features/design-system/DesignSystemPage.tsx`) — geen tab, geen route in `BottomNav` (blijft op 4 zichtbare tabs), alleen direct via URL. Toont elk uniform component (knoppen, kaarten, badges, inputs, checkboxen, kleuren/schaduwen/gradient-tokens, de sleepbare `Sheet`, `Logo`) met states en varianten op één plek. Nieuw herbruikbaar component? Voeg het hier ook toe.
- Tokens (kleur, radius, schaduw, spacing) horen in `src/styles/theme.css` / Tailwind config, niet hardcoded in componenten. Afgeleide waarden (tints, schaduwen, gradients) wijzen via `color-mix(in srgb, var(--token) X%, transparent)` terug naar een basistoken in plaats van een eigen rgba-tripel te dupliceren — verander je `--primary` of `--shadow-color` in theme.css, dan volgt elk component dat ernaar verwijst automatisch. Voor kleuren die Framer Motion moet animeren (`animate={{ backgroundColor: ... }}`) kan dat geen losse `var()`-string zijn — die worden in `src/app/lib/constants.tsx` één keer via `cssVar()` opgelezen uit hun CSS-token (zie `SAGE`, `MUTED_FG`, `DESTRUCTIVE`), zodat ook die nog steeds van het token afhangen in plaats van een eigen hex te hardcoden.
- Nieuwe visuele varianten gaan eerst als variant/prop op een bestaand component (cva-variants, zoals in `button.tsx`), niet als losse component met bijna-dezelfde stijl.

## 8. Conventions

- Domain code (schemas, store interface, selectors) is in English; user-facing copy and Dutch domain nouns (Vandaag, Huis, Routines, Samen, kamer, taak) stay Dutch — match the existing files.
- New screens/components go under `src/app/features/<naam>/`; shared UI in `src/app/components/`; shadcn primitives in `src/app/components/ui/` (don't hand-edit generated shadcn internals beyond what's needed — regenerate via shadcn conventions if a primitive needs real changes).
- Any new persisted field starts in `src/data/schemas.ts`, gets a domain type via inference in `types.ts`, and is exposed to screens through a view-model + selector — never read raw entities in a feature component.
- Run `pnpm typecheck` before considering a data-layer change done.

## 9. Devstraat

- `pnpm dev` — Vite dev server. `pnpm build` — productie-build (ook PWA-manifest/service worker via `vite-plugin-pwa`). `pnpm preview` — preview van de build. `pnpm typecheck` — `tsc --noEmit`, verplicht vóór elke data-layer wijziging (zie §8). `pnpm test` — `vitest run`, unit tests voor pure logica (`src/**/*.test.ts`, config in `vitest.config.ts`); vandaag dekt dat `src/data/selectors.ts` (done-state, due hints, routine-dichtheid, activiteitenfeed-sortering, reminder-triggers).
- Er is nog **geen lint-script of CI-workflow** in deze repo — typecheck en `pnpm test` zijn geautomatiseerd. Voeg je linting/CI toe, werk deze sectie dan bij zodat dit overzicht klopt.
- Omgevingsvariabelen staan in `.env.example` (`VITE_DATA_MODE`, Supabase-keys voor Phase 3+, VAPID-key voor push, AI-keys voor Phase 4 — die laatste twee blijven server-side, nooit `VITE_`-geprefixt).

## 10. Stack

React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (Radix), Zustand, Zod, react-router, motion (Framer Motion), Supabase (Phase 3+), vite-plugin-pwa. Package manager is `pnpm`.
