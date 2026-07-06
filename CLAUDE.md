# Cura

Een rustige, gedeelde huishoudplanner voor twee mensen. Geen schoonmaak-tracker, geen productiviteits-app met scoreborden — een plek die de mentale last van "wie doet wat en wanneer" wegneemt.

De UI/UX is gedesigned in Figma (via Make), op basis van het wireframe-brief in `src/imports/pasted_text/cura-design-brief.md`. De app is daarna herbouwd op een echte data-laag (Zustand + zod-schema's, lokaal of Supabase) terwijl het Figma-ontwerp leidend blijft.

## Doc-map — welk bestand waarvoor

| Bestand | Rol |
|---|---|
| **`CLAUDE.md`** (dit bestand) | Bron van waarheid voor agents: architectuur, conventies, anti-patronen, feature-map. Lees dit eerst. |
| `README.md` | Mens-onboarding: installeren, draaien, scripts, env, Supabase-setup. |
| `CONTRIBUTING.md` | Workflow: branch/commit, pre-PR-validatie, wanneer je docs bijwerkt. |
| `src/imports/pasted_text/cura-design-brief.md` | Bevroren wireframe-brief: toon, schermen, microcopy. Historisch — lees bij twijfel over toon/gedrag, maar de nav is sindsdien gewijzigd (zie §1). |
| `guidelines/Guidelines.md` | Dunne pointer terug naar §6/§7 en de design brief. |

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

### Data flow
- Feature code never imports `localStorage` or Supabase directly. It calls `useCuraStore`, which owns a `DataStore` instance (`src/data/store.ts`) selected by `VITE_DATA_MODE` (`local` or `cloud`).
- The store holds normalized **domain entities** in memory; screens render **view-models** (`TaskView`, `RoomView`, `RoutineView`, `ActivityView` in `src/data/types.ts`) produced by `src/data/selectors.ts`.
- **No derived state in domain schemas** (`src/data/schemas.ts`): no `done`, no density ratios, no hint text. Everything a screen needs that looks computed (a task's done/doneBy, a room's "waarschijnlijk weer toe" hint, a routine's "11 of 14") is derived by selectors from entities + completions.
- That split is what lets the app degrade gracefully with partial data and keeps the local/cloud swap a backend change, not a feature rewrite.

### One-household cap
- `getHouseholdsForUser` always returns a list, even though it's length 1 today.
- The "one household per user" rule is enforced in `acceptInvite` (app layer), not as a data-shape assumption — removing the cap later is a one-line change, not a migration.

### Completions are the event layer
- `completeTask` writes an event; `done`, the Samen feed, and routine density all derive from completions, not from a stored boolean.
- `uncompleteTask` removes the most recent one — no penalty, no "broken streak".

### App shell is a fixed, full-bleed PWA layer, not a scrolling document
- `index.html` locks `html`/`body` from scrolling; `MainShell` (`src/app/App.tsx`) is `fixed inset-0`, paints `AppBackground` behind everything, and only the route content area scrolls.
- `AppBackground` is the splash-screen artwork, served as `public/background.webp`. The 900 KB source PNG lives on only as splash art and is excluded from the service-worker precache together with `public/splash/*` via `globIgnores` in `vite.config.ts`.
- Layout reads `--safe-top/-bottom/-left/-right` (`env(safe-area-inset-*)`, defined in `src/styles/theme.css`) instead of assuming `h-screen` is safe — applied in the shell, `BottomNav`, the shared `Sheet`, and the full-screen auth/invite/error pages.
- The shared `Sheet` (`src/app/components/shared.tsx`) is always height-capped and internally scrollable, nudges itself above the on-screen keyboard via `useKeyboardInset` (`src/app/lib/useKeyboardInset.ts`, for browsers that don't resize the layout viewport), and supports drag-to-dismiss from the handle plus Escape-to-close.
- `ErrorBoundary` (`src/app/components/ErrorBoundary.tsx`) wraps the router so a render-time crash shows a calm recovery screen instead of a blank white page. Keep new top-level providers/imports that can throw synchronously (like a misconfigured Supabase client) defensive — a module-evaluation-time throw happens before the boundary can catch it.

## 4. Phasing

| Phase | Scope | Status |
|---|---|---|
| 1 | Vandaag, Huis, taak toevoegen — solo, `local` data mode | Built |
| 2 | Routines + dichtheid-feedback | Built |
| 3 | Samen, onboarding/invite-flow, `cloud` data mode (Supabase auth/RLS + Realtime) | Built |
| 4 | AI-invoer (natuurlijke taal bij toevoegen/aanpassen) | Not started |

Phase 1–2 work with zero backend (`VITE_DATA_MODE=local`, seeded via `src/data/local/seed.ts`). Switching to `VITE_DATA_MODE=cloud` swaps in `SupabaseStore` without touching feature code.

### Phase 3 implementation notes
- **Migrations** (all apply manually via the Supabase Dashboard SQL editor):
  - `supabase/migrations/20260630000000_init.sql` — schema + RLS.
  - `..._20260630010000_household_rename_invite_hardening_indexes.sql` — household-rename / invite-hardening / index follow-ups.
  - `20260630020000_task_due_date.sql` — wekker/deadline column (`alter table public.tasks add column due_date timestamptz`).
  - `20260630030000_members_update_policy.sql` — self-service rename policy (`members_update` RLS policy, self-scoped to `user_id = auth.uid()`, backing `ProfielSheet`'s "own display name" edit).
  - `20260630040000_task_description.sql` — task description column (`alter table public.tasks add column description text`).
- **Auth & onboarding:** email/password auth via `AuthProvider`/`AuthPage` (`signUp` reports back whether the project requires email confirmation, so the UI can show "check je mail" instead of hanging); "create your first household" onboarding via `CreateHouseholdPage`.
- **Invites** are shareable links (`/uitnodiging/:token`, `AcceptInvitePage`), expire after 7 days, and are single-use/revocable, backed by the `accept_invite`/`create_household` Postgres RPCs, not typed codes.
- **member id resolution:** `SupabaseStore` (`src/data/cloud/supabaseStore.ts`) resolves `members.id` from the Supabase auth uid via a private `memberIdFor()` helper wherever it writes `completedById`/`claimedById`/`createdById`/`ownerId` — those columns reference `members.id`, never `auth.uid()` directly.

### Realtime (cloud mode only)
- Requires the tables added to the `supabase_realtime` publication (`20260630050000_realtime_publication.sql` — a separate, additional step from the RLS policies in `init.sql`; without it `postgres_changes` never fires).
- `SupabaseStore.subscribeToChanges(householdId, onChange)` opens one `postgres_changes` channel per household covering `tasks`/`rooms`/`bundles`/`members` (filtered server-side on `household_id`) and `task_completions` (no `household_id` column of its own — relies on the same RLS policy, `task_completions_select`, that gates normal reads, since Supabase's Realtime feed is RLS-aware for the authenticated session).
- `useCuraStore.init()` subscribes after the initial load and debounces `onChange` (`REALTIME_DEBOUNCE_MS` = 400ms in `src/stores/useCuraStore.ts`) into a single re-fetch of members/rooms/tasks/completions/bundles, so a burst of remote writes causes one refresh, not one per row; `reset()` tears the subscription down.
- `LocalStore.subscribeToChanges()` is a no-op returning an empty unsubscribe, so `local` mode is untouched and callers never branch on `store.mode`. Refetching (pure `SELECT`s) can't itself trigger new `postgres_changes` events, so there's no feedback loop by construction.

## 5. Features

Houd deze lijst bij wanneer je een feature toevoegt, verwijdert, of van fase verandert — dit is de bron van waarheid voor "wat zit erin", niet alleen de phasing-tabel in §4.

### Vandaag — `src/app/features/vandaag/VandaagPage.tsx`
- Geplande taken van vandaag, afvinken, routines-van-vandaag, zacht zichtbaarheidsstrookje.
- De begroeting heeft een `PageBanner`-backdrop (`src/app/components/PageBanner.tsx`) — decoratieve aquarel-strook die absoluut achter een paginakop staat en onderaan naar de achtergrond vervaagt; hergebruikt `public/landing-header.webp` zodat openen en de dag beginnen als één moment voelen; rendert niets als het beeld ontbreekt.
- De lege "Mijn dag"-staat toont `public/empty-plants.webp` via de `image`-prop op `Leeg`.
- Onder "Misschien handig vandaag": handmatige suggesties (geen AI) uit bestaande data. `toSuggestions` (`src/data/selectors.ts`) filtert open, niet-geplande taken met een zachte due-hint of wekker, kortste duur eerst. `SuggestieRij` (`src/app/components/SuggestieRij.tsx`) biedt "Zet op mijn dag" (zet `planned: true`) en "Niet vandaag" (client-only dagelijkse dismissal via `useNietVandaag`, `src/app/lib/useNietVandaag.ts` — geen domeinveld, morgen is de taak weer een kandidaat).

### Huis — `src/app/features/huis/HuisPage.tsx`
- Kamer-kaarten met interval-hint, kamer-detail als pool-lijst, claim-actie ("ik pak dit"), kamer toevoegen/bewerken (`NewRoomSheet`, `EditRoomSheet`).
- `KamerKaart` toont de illustratie als royaal, ingesprongen beeld links op een crème kaart (`--card-art` in `src/styles/theme.css` — de crème van de illustraties zelf, gesampled uit `public/rooms/*`), via `RoomArt` (`src/app/components/RoomThumb.tsx`, art-of-fallback-paneel met instelbare fade-richting; kamers zonder kunst krijgen een getinte wash met lijn-icoon).
- Bij aanmaken/bewerken kies je de kamer via `KamerKunstKiezer` (`src/app/components/KamerKunstKiezer.tsx`, gedeeld grid van aquarel-tegels met dezelfde art/fallback via `RoomThumb`) — dit zet `iconKey`; beeld + kleur zijn daarvan afgeleid, dus geen apart persistent beeld-veld. De kamer-detailheader toont `RoomHero` (zelfde bestand, brede kamer-illustratie; stille fallback als het beeld ontbreekt).
- Aquarel-kamerkunst bestaat voor zes kamers in `public/rooms/*.png` (keuken, badkamer, toilet, woonkamer, slaapkamer, wasruimte — paden in `ICONS`, `src/app/lib/constants.tsx`); dit zijn **achtergrondloze** (transparante) PNG's zodat het onderwerp op elke ondergrond zweeft. Overige kamersoorten vallen terug op het getinte lijn-icoon.
- Een lege kamer (nieuw of leeggemaakt) toont `EmptyIllustration` (`src/app/components/EmptyIllustration.tsx`, standaard `public/empty-cloud.webp`, `src`-prop voor scene-specifieke kunst, rendert niets als het bestand ontbreekt) plus "Voeg snelle taken toe" i.p.v. de gewone lege staat. Dat opent `TemplatesSheet` (`src/app/sheets/TemplatesSheet.tsx`), een statische templatebibliotheek per soort ruimte (`src/app/lib/templates.ts` — Keuken/Badkamer/Woonkamer/Slaapkamer/Toilet/Algemeen, 5-8 per categorie) met multi-select en batchtoevoegen via `createTasksFromTemplates` (bouwt op de bestaande `store.createTask`, één gebundelde state-update i.p.v. losse toasts per taak).
- Sheets worden geopend via `useSheets().openTemplates` en gerenderd op `MainShell`-niveau, niet binnen de scrollende route-inhoud — die introduceert een eigen `position`-context waarin een `absolute` sheet achter de `BottomNav` zou belanden.

### Routines — `src/app/features/routines/RoutinesPage.tsx`
- Bundels van taken, dichtheid-feedback (ratio-over-venster), routine toevoegen/bewerken (`NewRoutineSheet`, `EditRoutineSheet`, `IntervalKiezer`).
- Per routine-taak zijn duur en beschrijving optioneel instelbaar door de taak-rij uit te klappen (`TaakDraftRij`), naast de titel; zichtbaar als duur-badge + beschrijving-regel in de uitgeklapte `RoutineKaart`.

### Samen — `src/app/features/samen/SamenPage.tsx`
- Chronologische "vandaag in huis"-feed. Geen eigen navigatietab meer; bereikbaar via de **Meer**-pagina.
- Zachte huishoudstatus-regel boven de feed (`householdStatusLine`, `src/app/lib/format.ts` — "Er is vandaag al wat lucht gemaakt" / "Rustige dag tot nu toe", nooit een telling).
- Elke activiteit heeft drie subtiele, omkeerbare reacties (`ActiviteitReacties`, `src/app/components/ActiviteitReacties.tsx`): "Bedank", "Mooi gedaan", "Ik pak de volgende" — client-only per dag (`useReacties`, `src/app/lib/useReacties.ts`, zelfde patroon als `useNietVandaag`), bewust geen nieuw domeinmodel/migratie voor zo'n kleine, persoonlijke micro-interactie. Geen punten, ranking of percentages per persoon.
- De lege feed-staat toont de twee-mokken-aquarel (`public/samen-mugs.webp`, `Leeg` met `imageAspect="wide"`).

### Meer — `src/app/features/meer/MeerPage.tsx`, route `/meer`
- Vervangt de oude Samen-navigatietab (icoon: `MoreHorizontal`, drie puntjes). Lijstpagina met links naar dingen die niet standaard in `BottomNav` staan: Samen (navigeert naar `/samen`), Takenoverzicht (navigeert naar `/taken`), Huishouden beheren (opent `HouseholdSheet` via `useSheets().openHousehold`), Account beheren (opent `ProfielSheet` via `useSheets().openProfiel`).
- Nieuwe niet-genavigeerde functionaliteit hoort hier, niet als losse tab.

### Takenoverzicht — `src/app/features/taken/TakenPage.tsx`, route `/taken`
- Geen eigen navigatietab; bereikbaar via **Meer** (en houdt de Meer-tab opgelicht, zoals Samen, via `isActive` in `BottomNav`).
- Toont alle open taken in vier kalme, op datum geordende groepen, afgeleid door `toTaskOverview` (`src/data/selectors.ts`, view-model `TaskOverview` in `types.ts`):
  - "Al even blijven liggen" (eenmalig met verstreken `dueDate`; bewust géén alarmerende "achterstallig"-toon, §2),
  - "Waarschijnlijk weer toe" (elke open terugkerende taak — een open terugkerende taak is per definitie weer toe, want binnen zijn interval afgevinkt telt als `done` en valt eruit, dus geen verdere datumsplitsing nodig),
  - "In de toekomst" (eenmalig, `dueDate` nu/later),
  - "Geen datum" (eenmalig zonder wekker).
- Lege groepen worden overgeslagen; is alles leeg, dan één `Leeg`-kaart.
- Bovenaan staan **kamerfilters** (`KeuzeChip`-pills: Alle + elke kamer met open taken + "Zonder kamer"; alleen zichtbaar bij ≥2 kamer-opties).
- Rijen hergebruiken `TaakRij` (afvinken + tik-om-te-bewerken); eenmalige taken in "Al even blijven liggen" krijgen een **"Maak nieuwe hiervan"**-knop die via `store.createTask` een verse kopie (titel/kamer/duur/beschrijving, zónder de verlopen wekker) in de pool zet. Puur afgeleid — losstaand van de vluchtige `useNietVandaag`/`useTaskDismissals`-dagdismissals.

### Taak toevoegen & bewerken
- **Taak toevoegen** (`AddTaskSheet`) — FAB-flow, één invoerveld + inklapbare opties (kamer, herhalen, wekker, duur, beschrijving), belandt standaard in de pool.
- **Taak bewerken** (`EditTaskSheet`) — opent via tik op een taakrij (niet op de checkbox of claim-knop); laadt de taak op id, gedeeld formulier via `TaskFormFields`, verwijderen-met-bevestiging.

### Swipe & verversen
- `TaakRij` ondersteunt veeg-naar-rechts om af te vinken/terug te zetten (Framer `drag="x"`, sage check-cirkel onthult zich achter de kaart; puur een verrijking — de checkbox blijft de toetsenbord/screenreader-route, en `useReducedMotion` schakelt het slepen uit).
- Pull-to-refresh op de app-shell (`usePullToRefresh` in `src/app/lib/`, alleen touch, activeert alleen bovenaan de scroll bij duidelijk verticale intentie; `PullToRefreshIndicator` toont een rustige druppel die meedraait met de pull en ademt tijdens het verversen — geen spinner).
- Beide bouwen op `useCuraStore.refresh()`, dezelfde her-fetch die de realtime-debounce gebruikt; werkt in beide data-modes (`local` is vrijwel instant en houdt een minimale beat aan).

### Wekker & duur op taken
- `dueDate` (ISO) op het `Task`-schema. Eenmalig = exacte deadline (datum+tijd); terugkerend = dagelijks tijdstip-deel. Badge (`wekkerLabel`) in `TaakRij`.
- De "welke taken zijn nu toe"-logica is puur en **tijdzone-bewust** in `src/data/reminders.ts` (`getDueReminders`/`isDone`/`buildLatestCompletionMap` + `DueReminder`); `selectors.ts` her-exporteert ze zodat call-sites niet wijzigen.
- Terwijl de app open is dispatcht `useTaskReminders` (in `MainShell`, poll elke 30s) een browser-Notification (of Sonner-toast als fallback).

### Push-notificaties — wekkers als de app dicht is
- Echte Web Push, alleen in `cloud`-modus (`local` houdt de in-app fallback; de push-paden zijn daar no-ops).
- Service worker `src/sw.ts` (vite-plugin-pwa **`injectManifest`**): precache + push/notificationclick/pushsubscriptionchange + een message-gated `SKIP_WAITING` die het `prompt`-update-flow intact houdt.
- Client abonneert via `usePushSubscription` (`src/app/lib/`, VAPID-publieke sleutel uit `VITE_VAPID_PUBLIC_KEY`) en slaat op via `store.savePushSubscription` → `push_subscriptions`-tabel.
- `pg_cron` (elke minuut) → `pg_net` → de `send-reminders` edge function (`supabase/functions/`), die `getDueReminders` draait met `household.time_zone`, dedupt via `reminder_dispatches` (`insert … on conflict do nothing`) en VAPID-signed pusht (`_shared/webpush.ts`, `@negrel/webpush`).
- `supabase/functions/_shared/reminders.ts` is een **byte-identieke kopie** van `src/data/reminders.ts` (Deno kan niet over de `src/`-grens importeren) — bewaakt door een gelijkheids-test in `src/data/reminders.test.ts`.
- Dubbele melding voorkomen: is de app zichtbaar, dan `postMessage`t de SW naar de tab i.p.v. `showNotification`; `tag: firedForKey` laat de UA overlap sowieso samenvoegen.
- Migraties `20260706000000_household_timezone` / `…010000_push_subscriptions` / `…020000_reminder_dispatches` / `…030000_reminder_cron` (die laatste leest het `CRON_SECRET` uit Supabase Vault — secret `cura_cron_secret`, eenmalig via `vault.create_secret` — i.p.v. een ingebakken placeholder; alleen de project-ref staat inline). Server-secrets (`VAPID_KEYS`, `CRON_SECRET`, evt. `VAPID_CONTACT`) via `supabase secrets set`, nooit `VITE_`-geprefixt.
- iOS krijgt push alleen als geïnstalleerde PWA (16.4+); `ProfielSheet` toont anders kalme "zet op beginscherm"-uitleg.

### Profiel — `ProfielSheet`
- Eigen weergavenaam/instellingen, meldingen-toggle (gekoppeld aan echte `Notification.permission` via `useNotificationPreference`), uitloggen.

### Auth & onboarding — `src/app/features/auth/`
- `AuthPage`: e-mail/wachtwoord login + registratie via `AuthForm`, plús een passwordless `MagicLinkForm` erboven — `signInWithMagicLink` (`AuthProvider`) stuurt een Supabase OTP-link (`signInWithOtp`), geen SSO-provider nodig. `LandingHeader` (`src/app/components/LandingHeader.tsx`, `public/landing-header.webp`) als full-bleed illustratie-header boven het formulier — valt terug op alleen logo + titel als het beeld ontbreekt.
- `CreateHouseholdPage`: "noem je huishouden" voor een ingelogde gebruiker zonder huishouden.
- Gated in `App.tsx`'s `Gate`-component via `useAuth()`; in `local` mode resolved `AuthProvider` synchroon naar "ingelogd" (§4).
- Magic-link- en Google-gebruikers hebben geen `displayName` in hun `user_metadata` (dat veld wordt alleen door het wachtwoord-registratieformulier gezet) — `metadataDisplayName()` (`src/data/cloud/supabaseStore.ts`) valt daarom terug op `full_name`/`name` en dan pas op "Ik" wanneer `createHousehold`/`acceptInvite` een lidnaam nodig hebben.

### Uitnodigen — `src/app/features/invite/AcceptInvitePage.tsx`, route `/uitnodiging/:token`
- Deelbare link, geen typecode, vervalt na 7 dagen en is eenmalig bruikbaar; `HouseholdSheet` genereert/herroept de link via `createInvite`/`revokeInvite` en laat de huishoudnaam ook echt opslaan (`updateHousehold`).

### App-shell & PWA-platform
- Vast (`fixed`/`fixed inset-0`) app-shell met `AppBackground` (splash-achtergrond, §3), safe-area-aware layout, sleepbare/Escape-sluitbare `Sheet`, en `ErrorBoundary` voor een rustig herstelscherm bij crashes (§3).
- Eigen `Logo`-component (`src/app/components/Logo.tsx`, bron `public/logo.svg`) als favicon/app-icon/op auth-schermen. iOS "Add to Home Screen" toont eigen splash screens (`public/splash/*`, gelinkt in `index.html`).
- Offline/update-UX (`ConnectivityBanner`, `UpdatePrompt` in `src/app/components/`, altijd gemonteerd in `App.tsx`): een zachte toast bij het wisselen van online/offline (`useOnlineStatus`) — in `cloud`-modus blijft daarnaast een kleine, niet-alarmerende pil zichtbaar zolang je offline bent ("wijzigingen lukken pas als je weer verbinding hebt"; `local`-modus werkt sowieso gewoon offline, dus geen permanente chrome nodig).
- Nieuwe service worker-versies wachten (`registerType: 'prompt'` in `vite.config.ts`, i.p.v. `autoUpdate`'s stille overname) tot de gebruiker zelf op "Vernieuwen" tikt in een oneindig-durende Sonner-toast (`useAppUpdate`, bouwt op `virtual:pwa-register/react` — vereist de `workbox-window`-dependency) — nooit een harde `confirm()`/reload zonder het te vragen.
- Sinds push draait de SW op **`injectManifest`** met eigen bron `src/sw.ts` (precache via `precacheAndRoute(self.__WB_MANIFEST)` + push-handlers); die bron **moet** de message-gated `SKIP_WAITING`-handler bevatten, anders blijft dit update-prompt hangen. `src/sw.ts` wordt apart getypecheckt (`tsconfig.worker.json`, WebWorker-lib) en is uitgesloten van de app-`tsconfig`.

### Laden zonder "null" — `src/app/components/Skeletons.tsx`
- `PageSkeleton`, `CardSkeleton`, `ListSkeleton` (zacht "ademende" kaarten via `.skeleton-breathe` in `src/styles/theme.css` — trage, lage-amplitude fade met een lichte golf per kaart i.p.v. Tailwinds fel knipperende `animate-pulse`; respecteert `prefers-reduced-motion`; geen spinner) en `FullScreenSkeleton` (ademend logo + "Even rustig opstarten…", voor auth/store-init-gates).
- Gebruikt in `App.tsx`'s `Gate` (auth loading, store-init, route-`Suspense`) zodat er nooit een blanco scherm flitst; ook op de design system-pagina (§7).

### Nog niet gebouwd
- AI-invoer (Phase 4).

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

### Waar bouwstenen horen
- **Eigen Cura-componenten** horen in `src/app/components/`: o.a. `KamerKaart`, `RoutineKaart`, `TaakRij`, `GroupCard`, `Logo`, `AppBackground`, `ErrorBoundary`, `PageBanner`.
- **Generieke primitieven** leven in `src/app/components/shared.tsx`: `Card` (standaard bg-card/rand/schaduw-kaart-chrome), `KeuzeChip` (elke selecteerbare pill — geen eigen chip-varianten per sheet), plus de knop-/veld-primitieven `PrimaryButton` (volledige-breedte gradient-CTA, glow via `--shadow-cta`), `DubbelKnop`, `PillButton`, `VerwijderKnop` (delete + inline-bevestiging), `IconButton` (ronde icoon-knop), `StatusBadge` (kleine sage-pill), `OptieKaart` (grote selecteerbare `border-2`-tegel voor kamer-grid/interval-presets) en `TaakToevoegRij`.
- **shadcn-primitives** in `src/app/components/ui/` zijn teruggesnoeid tot alleen wat de app rendert: `button`, `calendar`, `popover`, `utils`. Voeg alleen een nieuwe shadcn-primitive toe als je die ook echt gebruikt.
- Feature-pagina's componeren deze, ze herdefiniëren geen eigen knop/kaart/badge-stijl inline.

### Design-system-pagina
- Op `/dev/design-system` (`src/app/features/design-system/DesignSystemPage.tsx`) — geen tab, geen route in `BottomNav` (blijft op 4 zichtbare tabs), alleen direct via URL.
- Toont elk uniform component (knoppen, kaarten, badges, inputs, checkboxen, kleuren/schaduwen/gradient-tokens, de sleepbare `Sheet`, `Logo`) met states en varianten op één plek. **Nieuw herbruikbaar component? Voeg het hier ook toe.**

### Tokens
- Tokens (kleur, radius, schaduw, spacing) horen in `src/styles/theme.css` / Tailwind config, niet hardcoded in componenten.
- Afgeleide waarden (tints, schaduwen, gradients) wijzen via `color-mix(in srgb, var(--token) X%, transparent)` terug naar een basistoken in plaats van een eigen rgba-tripel te dupliceren — verander je `--primary` of `--shadow-color` in `src/styles/theme.css`, dan volgt elk component dat ernaar verwijst automatisch.
- Voor kleuren die Framer Motion moet animeren (`animate={{ backgroundColor: ... }}`) kan dat geen losse `var()`-string zijn — die worden in `src/app/lib/constants.tsx` één keer via `cssVar()` opgelezen uit hun CSS-token (zie `SAGE`, `MUTED_FG`, `DESTRUCTIVE`), zodat ook die nog steeds van het token afhangen in plaats van een eigen hex te hardcoden.

### Varianten & focus/typografie
- Nieuwe visuele varianten gaan eerst als variant/prop op een bestaand component (cva-variants, zoals in `button.tsx`), niet als losse component met bijna-dezelfde stijl.
- De standaard toetsenbord-focusring is de `focus-ring` Tailwind-utility (`@utility` in `src/styles/theme.css`), niet een handgetypte `focus-visible:ring-[color-mix(...)]`-keten. `Card` blijft bewust op de `outline-*`-variant (zodat de ring z'n eigen rust-schaduw niet overschrijft).
- De Lora-koptekst-stijl loopt via de `font-display`-utility (token `--font-display`), niet via inline `fontFamily`.

## 8. Conventions

- Domain code (schemas, store interface, selectors) is in English; user-facing copy and Dutch domain nouns (Vandaag, Huis, Routines, Samen, kamer, taak) stay Dutch — match the existing files.
- New screens/components go under `src/app/features/<naam>/`; shared UI in `src/app/components/`; shadcn primitives in `src/app/components/ui/` (don't hand-edit generated shadcn internals beyond what's needed — regenerate via shadcn conventions if a primitive needs real changes).
- Any new persisted field starts in `src/data/schemas.ts`, gets a domain type via inference in `types.ts`, and is exposed to screens through a view-model + selector — never read raw entities in a feature component.
- Run `pnpm typecheck` before considering a data-layer change done.

## 9. Devstraat

- `pnpm dev` — Vite dev server.
- `pnpm build` — productie-build (ook PWA-manifest/service worker via `vite-plugin-pwa`).
- `pnpm preview` — preview van de build.
- `pnpm typecheck` — `tsc --noEmit && tsc --noEmit -p tsconfig.worker.json` (app + service worker), verplicht vóór elke data-layer wijziging (zie §8).
- `pnpm test` — `vitest run`, unit tests voor pure logica (`src/**/*.test.ts`, config in `vitest.config.ts`); dekt `src/data/selectors.ts` (done-state, due hints, routine-dichtheid, activiteitenfeed-sortering) en `src/data/reminders.ts` (reminder-triggers, tijdzone-gedrag, en de byte-identiek-guard t.o.v. de edge-function-kopie).
- Er is nog **geen lint-script of CI-workflow** in deze repo — typecheck en `pnpm test` zijn geautomatiseerd. Voeg je linting/CI toe, werk deze sectie dan bij zodat dit overzicht klopt.
- Omgevingsvariabelen staan in `.env.example`: client-side `VITE_`-vars (`VITE_DATA_MODE`, Supabase-keys, `VITE_VAPID_PUBLIC_KEY`). Server-side secrets (VAPID-privésleutel als `VAPID_KEYS`, `CRON_SECRET`, AI-keys voor Phase 4) blijven server-side — nooit `VITE_`-geprefixt — en worden via `supabase secrets set` gezet, niet in `.env`.

Volledige setup- en contributie-stappen staan in `README.md` en `CONTRIBUTING.md`.

## 10. Stack

React 19, TypeScript, Vite, Tailwind v4, shadcn/ui (Radix), Zustand, Zod, react-router, motion (Framer Motion), Supabase (Phase 3+), vite-plugin-pwa. Package manager is `pnpm`.
