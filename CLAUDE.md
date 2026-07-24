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
- `AppBackground` is the splash-screen artwork, served as `public/background.webp`. The 900 KB source PNG lives on only as splash art and is excluded from the service-worker precache together with `public/splash/*` via `globIgnores` in `vite.config.ts`. A second layer on top, blended via `mix-blend-mode: soft-light`, tints the art with the current daypart (ochtend/middag/avond, `useDaypart` in `src/app/lib/useDaypart.ts`, re-derived every minute) — a wash over the art, not a replacement of it. `MainShell`'s bottom-nav fade scrim reads the same daypart via a separate flat (non-gradient) token, so the shell's light/color actually shifts across the day instead of staying flat — one shared mechanism (`getDaypart()` in `src/app/lib/format.ts`, factored out of `getGreeting`'s own ochtend/middag/avond boundaries; the quiet overnight stretch folds into avond, no separate night variant) feeding both, not two separate implementations. Tokens live in `src/styles/theme.css` (`--daypart-{ochtend,middag,avond}-{bg,nav}`) and derive from the existing palette via `color-mix()` (ochtend leans into `--card-art`'s peachy cream, avond deepens toward `--shadow-color`, middag is a no-op so today's midday look is unchanged) — driven by time of day via JS, not `prefers-color-scheme`.
- Layout reads `--safe-top/-bottom/-left/-right` (`env(safe-area-inset-*)`, defined in `src/styles/theme.css`) instead of assuming `h-screen` is safe — applied in the shell, `BottomNav`, the shared `Sheet`, and the full-screen auth/invite/error pages.
- Sonner's `<Toaster>` (`App.tsx`, the single top-level instance every `toast(...)` call renders into) is `position="bottom-center"`, anchored just above `BottomNav` (same offset as `FocusMiniPill`) — every other bit of transient/floating shell chrome already lives at the bottom, so a confirmation shouldn't send the eye back up top. Deliberately near-black/light-text (`--overlay-color`), distinct from the app's light card surfaces. **Do not use Sonner's own `offset` prop for the safe-area-aware offset** — it does its container positioning math in JS and can't parse a `calc(var(--safe-bottom) + …)` string (silently collapses the container to zero height and the toast overflows past the viewport edge); the offset is instead forced via a plain `[data-sonner-toaster] { ... !important }` rule in `theme.css`, which correctly resolves `env()`/`calc()` as real CSS.
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
- **tolerant loading:** the bulk LIST reads (`listMembers`/`listRooms`/`listTasks`/`listCompletions`/`listBundles`) run each row through `mapList` (`src/data/cloud/supabaseStore.ts`), which skips-and-logs a row that fails Zod validation instead of throwing out of `.map()`. One malformed row must never brick `init()` into the permanent "Laden lukte even niet" screen (§3 degrade-gracefully; this is the failure class behind the #54 timestamptz-offset crash — a single bad task took the whole app down on every restart). Single-row WRITE mappers stay strict: an unparseable write-back is a real error the caller toasts. Guarded by `supabaseStore.test.ts`.

### Realtime (cloud mode only)
- Requires the tables added to the `supabase_realtime` publication (`20260630050000_realtime_publication.sql` — a separate, additional step from the RLS policies in `init.sql`; without it `postgres_changes` never fires).
- `SupabaseStore.subscribeToChanges(householdId, onChange)` opens one `postgres_changes` channel per household covering `tasks`/`rooms`/`bundles`/`members` (filtered server-side on `household_id`) and `task_completions` (no `household_id` column of its own — relies on the same RLS policy, `task_completions_select`, that gates normal reads, since Supabase's Realtime feed is RLS-aware for the authenticated session).
- `useCuraStore.init()` subscribes after the initial load and debounces `onChange` (`REALTIME_DEBOUNCE_MS` = 400ms in `src/stores/useCuraStore.ts`) into a single re-fetch of members/rooms/tasks/completions/bundles, so a burst of remote writes causes one refresh, not one per row; `reset()` tears the subscription down.
- `LocalStore.subscribeToChanges()` is a no-op returning an empty unsubscribe, so `local` mode is untouched and callers never branch on `store.mode`. Refetching (pure `SELECT`s) can't itself trigger new `postgres_changes` events, so there's no feedback loop by construction.

## 5. Features

Houd deze lijst bij wanneer je een feature toevoegt, verwijdert, of van fase verandert — dit is de bron van waarheid voor "wat zit erin", niet alleen de phasing-tabel in §4.

### Vandaag — `src/app/features/vandaag/VandaagPage.tsx` (Tijdlijn-lay-out)
- Onder de begroeting een hero-voortgangskaart ("Lekker op weg" / "Alles rond" / "Klaar voor vandaag" / "Rustige dag") met een dunne voortgangsbalk + percentage over vandaag's geplande taken ("X van Y afgerond") — puur een aflezing van de huidige planning, geen los opgeslagen getal.
- Open taken staan in één gedeelde kaart, gegroepeerd in een dagdeel-tijdlijn (Ochtend/Middag/Avond, huidig dagdeel gemarkeerd met "nu") via `toDagdelen`/`dagdeelForHour` (`src/data/selectors.ts`) — een taak krijgt zijn dagdeel óf van zijn eigen expliciete `Task.dagdeel`-tag (optioneel, gezet via het "Wanneer"-veld in `TaskFormFields`, volledig los van de wekker — de gebruiker spreekt zijn eigen intentie uit, bv. "dit is ruwweg een ochtend-dingetje", zonder er een datum/tijd voor te hoeven zetten), óf, bij afwezigheid daarvan, van een echte wekker/`dueDate` (afgeleid van dat tijdstip); heeft een taak geen van beide, dan valt hij in een neutrale "Overig"-groep in plaats van een verzonnen moment (§2: eerlijkheid boven precisie). Rijen zijn `TijdlijnTaakRij` (`src/app/components/TijdlijnTaakRij.tsx`) — de tijdlijn-variant van `TaakRij`, beide bouwen op de gedeelde `useSwipeRow`-hook (`src/app/lib/useSwipeRow.ts`): geen eigen kaart-chrome, rijen staan direct in de gedeelde dagdeel-kaart; verder dezelfde interacties als `TaakRij` (veeg rechts = afvinken, veeg links = "niet vandaag", tik op titel = bewerken, "X pakt dit"-label bij een geclaimde taak — geen timer-knop hier, anders dan de losstaande `TaakRij`, zie §Swipe & verversen).
- `splitDagdelen` (`src/data/selectors.ts`) knipt die tijdlijn verder rond het huidige dagdeel: alleen het huidige dagdeel en alles daarvóór (`dagdelenNow`) staat in de hoofdkaart; dagdelen met een latere naam in de vaste ochtend→middag→avond-volgorde (`dagdelenLater`) staan achter een dichtgeklapte "Later vandaag"-toggle (telbadge + chevron, gedeelde `CollapsibleSection`, standaard dicht) — `Overig` telt nooit als "later", want dat heeft sowieso geen tijdsignaal. Let op: dit is puur een vergelijking van het uur-deel van `dueDate` (via `dagdeelForHour`, hetzelfde als `toDagdelen` hierboven) tegen het huidige uur — er wordt niet gecheckt of `dueDate` ook daadwerkelijk vandaag valt, dus een taak met een avond-wekker morgen (of een verlopen avond-wekker van gisteren) landt evengoed achter "Later vandaag".
- Een eenmalige swipe-hint leert een eerste-keer-gebruiker het veeggebaar: een dismissible banner boven de takenlijst ("Veeg een taak naar rechts om af te vinken, naar links om uit te stellen. Tik voor details.") plus een subtiele eenmalige "peek"-animatie (22px naar rechts en terug) op de eerste taak van `dagdelenNow` (niet per se de eerste zichtbare rij: valt alles achter "Later vandaag", dan is `dagdelenNow` leeg en krijgt geen enkele rij een peek, ook niet na het uitklappen) — beide gestuurd door `useSwipeHint` (`src/app/lib/useSwipeHint.ts`, `localStorage`-sleutel `cura:swipe-hint-seen`, zelfde eenmalige-hint-patroon als `useOnboardingSeen`), dicht na één tik op de sluitknop — blijft zo tenzij `localStorage` niet beschikbaar/schrijfbaar is (bv. privénavigatie), in dat geval komt de hint na een herlaad gewoon terug. De peek-animatie respecteert `prefers-reduced-motion` (via `useSwipeRow`'s `reduceMotion`, animeert de bestaande drag-`x`-motionvalue imperatief met `animate()`).
- Afgeronde geplande taken staan niet tussen de open taken, maar in een aparte, standaard ingeklapte "Afgerond"-sectie (telbadge + chevron, gedeelde `CollapsibleSection` uit `shared.tsx`) — toont alle momenteel afgeronde geplande taken (op basis van `done`, dat interval-/eeuwig-gebaseerd is, geen daggrens; zie §3), niet alleen wat vandaag is afgevinkt. Terugzetten kan met één tik op de rij, bewerken via het potlood-icoontje ernaast.
- Routines van vandaag staan als horizontaal scrollende ring-kaarten (`RoutineKaartCompact`, `src/app/components/RoutineKaart.tsx`) — ring-voortgang, trigger + telling, en een "Start"-knop die naar de bestaande routine-sessie navigeert (`/routines/:bundleId/starten`); geen losse subtaak-checkboxen meer op Vandaag zelf (wel nog via de sessie of de Routines-pagina).
- Onderaan staat een "Samen"-kaart (icoon, titel, subtitel) die naar `/samen` navigeert — een tweede ingang naast de Samen-rij op Meer. De subtitel toont de nieuwste huisgenoot-activiteit van vandaag ("{naam} rondde {taak} af") als die er is, anders "Zie wat huisgenoten vandaag deden"; een klein sage stipje naast de titel verschijnt zodra een huisgenoot vandaag iets heeft afgerond. Vervangt de oude, altijd-zichtbare huisgenoot-activiteitsstrook (en de latere inklapbare "Logboek"-sectie) — één oogopslag-regel i.p.v. een volledige lijst inline.
- Navigeert met `location.state = { from: "vandaag" }` zodat Samen's terugknop hierheen terugkeert i.p.v. altijd naar Meer (zie Samen hieronder).
- De begroeting heeft een `PageBanner`-backdrop (`src/app/components/PageBanner.tsx`) — decoratieve aquarel-strook die absoluut achter een paginakop staat en onderaan naar de achtergrond vervaagt; hergebruikt `public/landing-header.webp` zodat openen en de dag beginnen als één moment voelen; rendert niets als het beeld ontbreekt.
- De lege "Mijn dag"-staat toont `public/empty-plants.webp` via de `image`-prop op `Leeg`.
- Onder "Misschien handig" (kop met telbadge = aantal suggesties, plus een chevron die de hele sectie in-/uitklapt — standaard open): handmatige suggesties (geen AI) uit bestaande data. `toSuggestions` (`src/data/selectors.ts`) filtert open, niet-geplande taken uit drie zachte klassen — zacht-verschuldigd (`dueHint` "Waarschijnlijk weer toe"), met een wekker, óf kort genoeg om tussendoor te doen (`durationMin` ≤ `TUSSENDOOR_MAX_MIN` = 10, de "past goed tussendoor"-klasse) — kortste duur eerst, gecapt op 4. Elke rij (`SuggestieRij`, `src/app/components/SuggestieRij.tsx`) is compact: titel + één regel `reden · kamer · duur`, met de eerlijke reden vooraan ("Waarschijnlijk weer toe" / "Staat met een wekker" / "Past goed tussendoor"), en twee icoonacties rechts — een groene ronde **+** ("Zet op mijn dag", zet `planned: true`, via `IconButton tone="primary"`) en een subtiele **×** ("Niet vandaag", client-only dagelijkse dismissal via `useNietVandaag`, `src/app/lib/useNietVandaag.ts` — geen domeinveld, morgen is de taak weer een kandidaat).
- Iets op je dag zetten (vanuit een suggestie, of via de "Zet op mijn dag"-toggle bij taak toevoegen/bewerken) claimt de taak meteen voor de handelende gebruiker, tenzij iemand anders hem al had gepakt — een zachte "ik doe dit"-intentie zonder een tweede "ik pak dit"-tik. Gecentraliseerd in `useCuraStore.createTask`/`updateTask` (`src/stores/useCuraStore.ts`), niet per call-site.
- Een taak die vandaag rechtstreeks uit een Huis-kamer is opgepakt (heeft een `roomId` en `Task.pickedUpAt` valt op vandaag) krijgt een eigen "Vandaag opgepakt"-kaart met plus-icoon, boven de dagdeel-tijdlijn en los van de Ochtend/Middag/Avond/Overig-groepen — `splitPickedUpToday` (`src/data/selectors.ts`) haalt die taken uit de lijst die naar `toDagdelen` gaat. Rijen in deze groep krijgen geen `onDismiss` (dus geen veeg-links-uitstel): loslaten in Huis is voor zo'n net-geclaimde taak de logischere undo dan "morgen weer". Huishoud-breed, niet gefilterd op wie de taak claimde — net als de rest van Vandaag. De eenmalige swipe-hint (banner + peek, zie hierboven) mikt nooit op een rij in deze groep en de banner verschijnt alleen als er ook echt een veegbare rij op het scherm staat — anders zou de hint een gebaar beloven dat op de emphasized rij niets doet.
- `Task.pickedUpAt` (ISO, migratie `20260723000000_task_picked_up_at.sql`) is de ruwe timestamp waar dat op leunt, maar wordt **uitsluitend** gezet door de expliciete Huis pool-claim/"Laat los"-actie (`useCuraStore`'s top-level `claimTask`, aangeroepen vanuit `HuisPage`) — NIET door de generieke planned-auto-claim in `createTask`/`updateTask` (AddTaskSheet/EditTaskSheet/SuggestieRij's "Zet op mijn dag" lopen daar overheen). Zonder dat onderscheid zou elke taak met een `roomId` die je vanuit een suggestie op je dag zet ook als "net opgepakt" lezen. `claimTask` kreeg er daarom een `trackPickup`-parameter bij (default `false`; alleen de Huis-actie zet 'm op `true`). Degradeert net als `started_at`/`checklist_items` stil als de migratie nog niet is uitgevoerd — `isMissingTaskColumn`/`missingTaskColumns` (nu een kwartet, inclusief `dagdeel`) stript per retry alleen de kolom(men) die de Postgrest-fout daadwerkelijk noemt, nooit blind alle vier, zodat een nog-niet-gemigreerde kolom geen al gemigreerde met zich meesleurt.
- `Task.dagdeel` (migratie `20260724000000_task_dagdeel.sql`, `text` met een `check`-constraint op `ochtend`/`middag`/`avond`) volgt hetzelfde degradeer-patroon: tot de migratie handmatig is toegepast, valt een schrijfpoging naar deze kolom stil terug zonder de rest van de save te breken (de "Wanneer"-keuze gaat dan simpelweg niet mee, de taak zelf slaat wél op).

### Huis — `src/app/features/huis/HuisPage.tsx`
- Eén doorlopende pagina, geen tab-toggle: "Alle taken" (kop met een huishoud-breed, ongefilterd open-aantal-badge, filters, takenlijst) staat direct boven "Kamers" (kamer-grid) — geen component-state om te vergeten bij het openen/verlaten van een kamer.
- "Alle taken" toont alle open + afgeronde taken huishoud-breed via `TaakRij`, filterbaar op kamer en duur (`KeuzeChip`-pills: alle/≤15/15–45/45+ min) — puur een client-side filter over `useTaskViews()`, geen eigen view-model/selector. Afgeronde taken zitten in een inklapbare `CollapsibleSection` ("Afgerond", standaard dicht, zelfde patroon als Vandaag) zodat een lange, huishoud-brede afgerond-lijst de open taken niet begraaft.
- Het kamer-grid sorteert lokaal (niet via de gedeelde `useRoomViews`-hook, die ook de kamer-kiezers in `AddTaskSheet`/`EditTaskSheet` voedt) op `openCount` aflopend; de hoogst scorende kamer met open taken krijgt `KamerKaart`'s `featured`-variant (badge "Verdient aandacht", sterkere rand/schaduw) — puur op het al afgeleide `openCount`, geen gefabriceerde "X dagen geleden"-claim (§2 eerlijkheid boven precisie).
- Kamer-kaarten met interval-hint, kamer-detail als pool-lijst, kamer toevoegen/bewerken (`NewRoomSheet`, `EditRoomSheet`). Een ongeclaimde pool-taak (kamer-detail én "Alle taken") claimen doet je door de rij naar rechts te vegen ("op mijn dag zetten" — `onPlan` op `TaakRij`, zet `planned: true` en claimt in één beweging via `HuisPage`'s `planTask`); geen los "Ik pak dit"-knopje meer op de kaart. Is de taak al geclaimd, dan blijft "Laat los" de expliciete knop om de claim terug te geven.
- `KamerKaart` toont het ronde "alles gedaan"-vinkje alleen als de kamer ook echt taken heeft die allemaal zijn afgerond (`openCount === 0 && room.tasks.length > 0`) — een kamer zonder taken toont geen badge, om een net aangemaakte lege kamer niet als "klaar" te labelen.
- `KamerKaart` toont de illustratie als royaal, ingesprongen beeld links op een crème kaart (`--card-art` in `src/styles/theme.css` — de crème van de illustraties zelf, gesampled uit `public/rooms/*`), via `RoomArt` (`src/app/components/RoomThumb.tsx`, art-of-fallback-paneel met instelbare fade-richting; kamers zonder kunst krijgen een getinte wash met lijn-icoon).
- Bij aanmaken/bewerken kies je de kamer via `KamerKunstKiezer` (`src/app/components/KamerKunstKiezer.tsx`, gedeeld grid van aquarel-tegels met dezelfde art/fallback via `RoomThumb`) — dit zet `iconKey`; beeld + kleur zijn daarvan afgeleid, dus geen apart persistent beeld-veld. De kamer-detailheader toont `RoomHero` (zelfde bestand, brede kamer-illustratie; stille fallback als het beeld ontbreekt).
- Aquarel-kamerkunst bestaat voor zes kamers in `public/rooms/*.png` (keuken, badkamer, toilet, woonkamer, slaapkamer, wasruimte — paden in `ICONS`, `src/app/lib/constants.tsx`); dit zijn **achtergrondloze** (transparante) PNG's zodat het onderwerp op elke ondergrond zweeft. Overige kamersoorten vallen terug op het getinte lijn-icoon.
- Snelle taken toevoegen is inline, geen sheet: de kamer-detailpagina toont tot 2 taken uit de statische templatebibliotheek van die kamer-categorie (`src/app/lib/templates.ts` — Keuken/Badkamer/Woonkamer/Slaapkamer/Toilet/Algemeen, 5-8 per categorie, categorie afgeleid uit `iconKey` via `categoryForIconKey`) als kale, direct-tikbare rijen ("Snel toevoegen") — al toegevoegde titels vallen eruit, dus een rij verdwijnt zodra hij gebruikt is. Tikken roept meteen `store.createTasksFromTemplates(roomId, [template])` aan (bouwt op de bestaande `store.createTask`), geen categorie-keuze, geen multi-select, geen bevestigingsknop. Een lege kamer toont hetzelfde `EmptyIllustration`-lege-staat-patroon als een lege kamerlijst, met deze rijen eronder in plaats van een aparte "snelle taken"-sheet.

### Routines — `src/app/features/routines/RoutinesPage.tsx`
- Bundels van taken, dichtheid-feedback (ratio-over-venster), routine toevoegen/bewerken (`NewRoutineSheet`, `EditRoutineSheet`, `IntervalKiezer`).
- Per routine-taak zijn duur en beschrijving optioneel instelbaar door de taak-rij uit te klappen (`TaakDraftRij`), naast de titel; zichtbaar als duur-badge + beschrijving-regel in de uitgeklapte `RoutineKaart`.
- **Routine starten** (`RoutineSessionPage.tsx`, route `/routines/:bundleId/starten`) — een "Start"-knop op de uitgeklapte `RoutineKaart` (zichtbaar zolang er open taken zijn) opent een volledig-scherm sessie die de open taken van die routine één voor één toont, met Afvinken (bestaande `toggleTask`) en een sessie-lokale, niet-gepersisteerde "Overslaan". Geen eigen store/gepersisteerde voortgang: de huidige taak wordt live afgeleid uit `useRoutineView`, dus wegnavigeren en herstarten hervat vanzelf. `MainShell` verbergt de onderbalk en de bottom-gradient op deze route voor een echte takeover (`isRoutineSession`-check in `src/app/App.tsx`, via `matchPath`).
- De afgeronde ("Routine gedaan voor nu.") staat toont `CompletionBloom` (`src/app/components/shared.tsx`) — een 88px sage-gradient vinkjesbadge die met een scale-overshoot binnenkomt (de `bloom`-variant, `src/app/lib/motion.ts`: `scale: [0.6, 1.06, 1]`). Bewust een ANDER, groter gewicht dan elke taak-naar-taak-overgang in dezelfde sessie (die blijft op de gedeelde `fadeUp`) — een hele routine afronden is een van de weinige plekken waar CLAUDE.md §2's streak/scoreboard-terughoudendheid een expliciet "klaar"-gevoel juist wél toelaat. Gedeelde primitive, niet inline: ook bruikbaar voor een ander toekomstig echt sessie-afrondingsmoment.

### Samen — `src/app/features/samen/SamenPage.tsx`
- Chronologische "vandaag in huis"-feed. Geen eigen navigatietab; bereikbaar via zowel de **Meer**-pagina als een preview-kaart op Vandaag (zie hierboven).
- De terugknop is herkomst-bewust: `useLocation().state?.from` bepaalt of "terug" naar Vandaag of naar Meer gaat, al naar gelang waar de gebruiker vandaan kwam (beide call-sites geven `{ from: "vandaag" | "meer" }` mee bij het navigeren); zonder navigatie-state (directe link, herlaad) valt het terug op Meer.
- Zachte huishoudstatus-regel boven de feed (`householdStatusLine`, `src/app/lib/format.ts` — "Er is vandaag al wat lucht gemaakt" / "Rustige dag tot nu toe", nooit een telling).
- Elke activiteit heeft drie subtiele, omkeerbare reacties (`ActiviteitReacties`, `src/app/components/ActiviteitReacties.tsx`): "Bedank", "Mooi gedaan", "Ik pak de volgende" — client-only per dag (`useReacties`, `src/app/lib/useReacties.ts`, zelfde patroon als `useNietVandaag`), bewust geen nieuw domeinmodel/migratie voor zo'n kleine, persoonlijke micro-interactie. Geen punten, ranking of percentages per persoon.
- De lege feed-staat toont de twee-mokken-aquarel (`public/samen-mugs.webp`, `Leeg` met `imageAspect="wide"`).

### Meer — `src/app/features/meer/MeerPage.tsx`, route `/meer`
- Vervangt de oude Samen-navigatietab (icoon: `MoreHorizontal`, drie puntjes). Lijstpagina met links naar dingen die niet standaard in `BottomNav` staan: Samen (navigeert naar `/samen`), Takenoverzicht (navigeert naar `/taken`), Boodschappen (navigeert naar `/boodschappen`), Huishouden beheren (opent `HouseholdSheet` via `useSheets().openHousehold`), Account beheren (opent `ProfielSheet` via `useSheets().openProfiel`).
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

### Focustimer — `src/app/features/focus/FocusPage.tsx`, route `/focus`
- Een **zachte, pomodoro-achtige** focustimer: vrij te starten (duur-presets 15/25/50 min) of vanaf een taak. Bewust géén rondes-teller/streak (§2); afronden geeft een kalme melding met "Korte pauze" en — vanaf een taak — "Afvinken".
- Geen eigen navigatietab; bereikbaar via **Meer** (icoon `Timer`) en houdt de Meer-tab opgelicht via de `isActive`-special-case in `BottomNav` (zoals Samen/Taken). Vanaf een taak start je via een klein `Timer`-knopje op `TaakRij`/`TijdlijnTaakRij` (`onStartFocus`-prop, gedeeld hulp-hook `useStartFocus`, `src/app/lib/`) — bedraad op Vandaag/Taken/Huis; alleen zichtbaar op open (niet-afgeronde) taken. Swipe-naar-links blijft puur `onDismiss` (zie §Swipe & verversen) — geen aparte focustimer-route via swipe.
- **State leeft in een aparte, kleine Zustand-store** `usePomodoroStore` (`src/stores/`), bewust los van `useCuraStore` (dat is voor domein-entiteiten): een lopende timer is vluchtige, apparaat-lokale UI-state, verwant aan de `useNietVandaag`/`useReacties`-hooks maar gedeeld tussen scherm + mini-pill + tick-hook. Handmatige `localStorage`-persistentie (key `cura:focus-timer`, niet datum-gescoped); de tijd wordt afgeleid van een eind-timestamp (`endsAt`), niet afgeteld, zodat tab-throttling/herladen de tijd niet laat verlopen (verstreken-bij-herladen → stil terug naar idle, geen verouderde melding).
- `useFocusTimer` (`src/app/lib/`) draait de seconde-tik op **MainShell-niveau** (naast `useTaskReminders`) zodat de timer doorloopt bij tabwissel — routes/sheets unmounten. `FocusMiniPill` (`src/app/components/`) toont linksonder een zwevend pilletje zolang de timer loopt/pauzeert en je niet op `/focus` bent; tik = terug. De grote ring + m:ss zit in het herbruikbare `TimerDisplay` (hergebruikt `RingProgress`, Lora-cijfers via `font-display`), ook op de design-system-pagina.
- Buiten scope: push als de app volledig dicht is (dat is het losstaande wekker-/`send-reminders`-systeem); wél een OS-`Notification` als attentie wanneer de tab op de achtergrond staat, met dezelfde meldingen-voorkeur als de wekkers.

### Boodschappenlijst — `src/app/features/boodschappen/BoodschappenPage.tsx`, route `/boodschappen`
- Geen eigen navigatietab; bereikbaar via **Meer** (icoon `ShoppingCart`) en houdt de Meer-tab opgelicht via de `isActive`-special-case in `BottomNav` (zoals Samen/Taken/Focus).
- Gedeeld huishouden-brede lijst (`ShoppingItem`: titel + optioneel gestructureerd `amount`/`unit` (`ShoppingUnitSchema`: `stuks`/`g`/`kg`/`ml`/`l`, bv. "500ml melk", "1kg suiker") + optionele vrije-tekst `description`). **Bewuste afwijking** van de "geen afgeleide state in domeinschema's"-regel (§3): `checked` is een direct opgeslagen boolean, niet afgeleid uit een event-log zoals `Task.done`/`TaskCompletion`. Een boodschap heeft geen herhaling, geen dichtheid/streak-verhaal en verschijnt nooit in de Samen-feed — het is een wegwerplijstje, geen activiteitenlog, dus event-sourcing van die boolean zou onnodige complexiteit toevoegen. Zie het schemacommentaar in `src/data/schemas.ts` voor dezelfde toelichting.
- Het oude vrij-tekst `quantity`-veld ("2", "1 pak") blijft in het schema staan als **legacy-only** fallback voor rijen van vóór amount/unit bestond — nieuwe/bewerkte items schrijven er niet meer naar. `formatShoppingQuantity` (`src/data/selectors.ts`) is de enige plek die kiest: amount+unit als die er zijn, anders de legacy `quantity`-tekst. `ShoppingItemView.quantity` is dus altijd het **berekende** weergavelabel, nooit een raw entity-veld (§3).
- Open items worden gegroepeerd in kalme categorie-secties (Vers/Koeling/Voorraad/Huis/Nog ergens) — `toShoppingList` (`src/data/selectors.ts`) matcht de titel tegen een vaste NL-trefwoordenlijst per categorie (`shoppingCategory`) en levert `openGroups` (`ShoppingCategoryView[]`) naast de platte `open`/`checked`-lijsten; lege categorieën worden overgeslagen. Afgevinkte items blijven in de platte `checked`-lijst, niet gegroepeerd.
- Afgevinkte items blijven zichtbaar (doorgestreept) tot ze bewust gewist worden — "Wis afgevinkte items" (alleen afgevinkte) of "Wis hele lijst" (alles, met inline bevestiging via `VerwijderKnop`, want dat verliest ook nog-niet-gehaalde items).
- Snel toevoegen via een pagina-lokale `BoodschapToevoegRij` bovenaan de pagina — geen sheet; titel + aantal op één rij, met eenheid- en categorie-snelkeuzechips eronder (geen vrije-tekst-parser meer: aantal en eenheid zijn losse velden, geen combinatie als "2 melk" om uit elkaar te trekken). Rijen (`BoodschapRij`, `src/app/components/`) hebben een inline bewerk-modus (potlood-icoon: titel, aantal, eenheidchips, optionele beschrijving) en swipe-naar-links-om-te-verwijderen; losse items verwijderen heeft bewust géén bevestigingsstap (laag risico, triviaal opnieuw toe te voegen).
- Het aantal-veld is een dropdown (`VeldSelect`, `src/app/components/shared.tsx` — gedeeld field-styled `<select>`, zelfde chrome als `VeldInput`), geen los getal-veld: de opties zijn eenheid-bewuste realistische presets (`SHOPPING_AMOUNT_PRESETS`/`shoppingAmountOptions`, `src/data/selectors.ts` — stuks 1-12, g/ml 100-1000, kg/l 0,5-5) in plaats van een 1..N-reeks, zodat "6 stuks" en "500g" allebei als kiesbare optie voelen. Wisselen van eenheid (chip) leegt het gekozen aantal, want de presets verschillen volledig per eenheid. Bewerken vult een bestaand, niet-preset aantal (bv. een ouder item) alsnog in als extra optie, zodat bewerken nooit stil een echte waarde wegvaagt.
- **"Zet op mijn dag"** (in de `PageHeader`-actie, alleen zichtbaar zolang er open items zijn en er nog geen open taak "Boodschappen" bestaat) maakt via de bestaande `store.createTask` een taak "Boodschappen" aan (`planned: true`, `description` = een samenvatting van de nog-open items) — geen eigen data-laag-methode nodig, puur hergebruik van de taken-flow zodat "boodschappen doen" ook geclaimd/afgevinkt kan worden zoals elke andere taak. Die `planned: true` claimt de taak meteen voor jou (zelfde auto-claim als op Vandaag, zie hierboven).
- Migraties `20260706040000_shopping_items.sql` (RLS + realtime-publicatie, zelfde patroon als `rooms`), `20260709000000_shopping_item_category.sql` (optionele `category`), `20260709010000_shopping_item_amount_unit_description.sql` (`amount`/`unit`/`description`). Omdat migraties handmatig worden toegepast en kunnen achterlopen op de gedeployde code, degradeert `SupabaseStore` (`isMissingShoppingColumn`/`withoutNewShoppingColumns`, `src/data/cloud/supabaseStore.ts`) stil naar een insert/update zonder de nog-ontbrekende kolommen i.p.v. te falen — zelfde patroon als de eerdere `category`-fallback, nu gegeneraliseerd over alle vier optionele kolommen.

### Taak toevoegen & bewerken
- **Taak toevoegen** (`AddTaskSheet`) — FAB-flow, één invoerveld + inklapbare opties (kamer, herhalen, wekker, duur, beschrijving), belandt standaard in de pool.
- De FAB (`MainShell`, `src/app/App.tsx`) is één universeel instappunt voor zowel taken als boodschappen: een `addMode`-state (`"taak" | "boodschap"`) bepaalt welke van de twee sheets opent, met een `AddModeToggle`-kiezer (twee `KeuzeChip`'s) die als `headerExtra`-slot bovenin zowel `AddTaskSheet` als `BoodschapToevoegSheet` wordt geïnjecteerd — beide sheets blijven verder ongewijzigd en zelfstandig bruikbaar (`BoodschappenPage`'s eigen inline "+"-pil opent `BoodschapToevoegSheet` nog steeds rechtstreeks, zonder toggle). `addMode` reset bij elke FAB-tik naar een contextueel default: `"boodschap"` op `/boodschappen` (die pagina's FAB opende voorheen per ongeluk altijd de taak-sheet), anders `"taak"`. De bestaande pool-first-semantiek van taken toevoegen (§2) blijft ongewijzigd — alleen het FAB-instappunt kreeg een keuze, niet het gedrag van `AddTaskSheet` zelf.
- **Taak bewerken** (`EditTaskSheet`) — opent via tik op een taakrij (niet op de checkbox of claim-knop); laadt de taak op id, gedeeld formulier via `TaskFormFields`, verwijderen-met-bevestiging.
- De gedeelde "Zet op mijn dag"-toggle in `TaskFormFields` (`opMijnDag`) is ook een zachte claim: alleen bij de overgang naar `planned: true` (aanmaken, of bewerken vanuit niet-gepland) en alleen als niemand anders de taak al had gepakt.
- **Alleen `EditTaskSheet`** (niet `AddTaskSheet`, die nog geen taak-id heeft) toont bij een echt twee-persoons-huishouden een "Wie pakt dit op?"-kiezer (drie `KeuzeChip`'s: Niemand/Jij/partnernaam) die meteen, los van de rest van het formulier, schrijft via `useCuraStore.assignTask(taskId, memberId | null)`. Beide huisgenoten kunnen zo de taak aan de ANDER toewijzen, niet alleen aan zichzelf claimen/loslaten (§2: optioneel en omkeerbaar blijft intact — wie mag *initiëren* verandert, niet of het terug te draaien is). `assignTask` is de tegenhanger van `claimTask`: die laatste neemt een auth-uid (cloud) die `DataStore` intern naar een `members.id` resolvet en is dus altijd de ingelogde gebruiker zelf; `assignTask` neemt al een `members.id` rechtstreeks aan (geen resolutie), zodat het élk lid kan targeten — ook een lid zonder gekoppeld auth-account (bv. local mode's tweede, demo-only huisgenoot). Stamt nooit `pickedUpAt` (dat blijft voorbehouden aan Huis' pool-claim-actie). `TaskView.claimedById` (raw member id, naast het al bestaande `claimedBy`-weergavenaam) drijft de selectiestaat van de kiezer — zelfde ID-vergelijkingspatroon als `doneById`.
- `TaskFormFields` heeft een altijd-zichtbaar, optioneel "Wanneer"-veld (drie `KeuzeChip`'s: Ochtend/Middag/Avond, tikken op het al geselecteerde segment deselecteert — zelfde toggle-patroon als `EditRoomSheet`'s eigenaar-kiezer) dat rechtstreeks `Task.dagdeel` zet, zowel in `AddTaskSheet` als `EditTaskSheet`. Bewust geen default-selectie en geen "verplicht kiezen": een taak zonder wekker EN zonder dagdeel-tag blijft gewoon in "Overig" vallen (zie Vandaag hierboven).

### Status & checklist op taken
- **Status is geen los opgeslagen veld.** `Task.startedAt` (ISO, optioneel) is de enige nieuwe ruwe waarheid — zelfde filosofie als `dueDate`. De mens-leesbare status ("niet gestart"/"bezig"/"klaar") wordt uitsluitend afgeleid in `toTaskView` (`src/data/selectors.ts`): `done` (bestaand, uit completions) → "klaar", anders `startedAt` gezet → "bezig", anders "niet gestart" (§3: geen afgeleide state in domeinschema's).
- **Checklist** (`Task.checklistItems: {id, title, checked}[]`, `jsonb`-kolom, default `[]`) is — net als `ShoppingItem.checked` — een bewuste, gedocumenteerde afwijking van diezelfde regel: `checked` is direct opgeslagen, geen event-log (een subtaak heeft geen herhaling/dichtheid en leeft altijd binnen het edit-formulier van zijn taak). **Volledig onafhankelijk** van de hoofd-checkbox van de taak: alle items afvinken vinkt de taak zelf niet af, en andersom.
- Een checklist-item afvinken zet `startedAt` automatisch (alleen bij de overgang naar "heeft een afgevinkt item", nooit een al gestarte taak overschrijvend) — gecentraliseerd in `useCuraStore.createTask`/`updateTask`, zelfde patroon en zelfde plek als de `planned`-auto-claim hierboven, dus niet per call-site herhaald. Handmatig "Gestart" is een losse `Toggle` in `TaskFormFields` die hetzelfde veld zet/wist, zonder de checklist aan te raken.
- Checklist en "Gestart" worden bewerkt binnen `TaskFormFields`/`AddTaskSheet`/`EditTaskSheet` — er is geen los taakdetailscherm. Nieuwe items via `ChecklistItemRij` (`src/app/sheets/`, naast `TaakDraftRij`, geen eigen design-system-pagina-entry — zelfde precedent als `TaakDraftRij`) + de bestaande `TaakToevoegRij`. Voortgangsbadge ("2/5") en een "Bezig"-badge staan in zowel `TaakRij` als `TijdlijnTaakRij` — de badge-rij is gedupliceerd tussen die twee bestanden, dus altijd beide aanpassen.
- Migratie `20260713000000_task_checklist_started_at.sql` voegt `started_at`/`checklist_items` toe aan `tasks`. Omdat migraties handmatig worden toegepast, degradeert `SupabaseStore` net als bij `shopping_items` stil naar een insert/update zonder deze kolommen als de migratie nog niet is uitgevoerd (`isMissingTaskColumn`/`withoutNewTaskColumns`, tweede kopie van hetzelfde patroon — zie Boodschappenlijst hierboven).

### Swipe & verversen
- `TaakRij` en `TijdlijnTaakRij` ondersteunen veeg-naar-rechts om af te vinken/terug te zetten (Framer `drag="x"`, sage check-cirkel onthult zich achter de kaart; puur een verrijking — de checkbox blijft de toetsenbord/screenreader-route, en `useReducedMotion` schakelt het slepen uit) via de gedeelde `useSwipeRow`-hook (`src/app/lib/useSwipeRow.ts`, drag-mechaniek + commit-drempels op één plek). Op een ongeclaimde pool-rij (`onPlan` bedraad, alleen `TaakRij` in Huis) betekent veeg-naar-rechts in plaats daarvan "op mijn dag zetten" (sage kalender-cirkel i.p.v. het vinkje, via `useSwipeRow`'s `onSwipeRight`-override) — zodra de taak geclaimd is, valt de rij terug op het gewone afvink-gedrag. Veeg-naar-links roept simpelweg de `onDismiss` op die de call-site meegeeft (meestal "niet vandaag", rode ×) — er is geen aparte focustimer-tak meer in `TaakRij`/`TijdlijnTaakRij` zelf. `TijdlijnTaakRij` spiegelt alleen het afvink-gedrag (geen `onPlan`, want Vandaag toont al geplande taken).
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
- **Stille uren** (per lid, `ProfielSheet`): `quietHoursStart`/`quietHoursEnd` (`"HH:mm"`, beide gezet = aan) op `Member` (migratie `20260708000000_member_quiet_hours`). `isWithinQuietHours` (`src/data/reminders.ts`, meegekopieerd naar `_shared/reminders.ts`) is puur en tijdzone-bewust (households `time_zone`), en houdt alleen de *ping* tegen — de taak blijft gewoon toe. `useTaskReminders` slaat de dispatch over voor het ingelogde lid (geen `firedRef`-entry, dus de eerstvolgende poll na het einde van het venster vuurt alsnog); `send-reminders` filtert per `push_subscriptions`-rij op het gekoppelde lid, en slaat de `reminder_dispatches`-claim over (dus geen dagelijkse melding verbruikt) als *iedereen* in het huishouden op dat moment stil staat.
- Migraties `20260706000000_household_timezone` / `…010000_push_subscriptions` / `…020000_reminder_dispatches` / `…030000_reminder_cron` (die laatste leest het `CRON_SECRET` uit Supabase Vault — secret `cura_cron_secret`, eenmalig via `vault.create_secret` — i.p.v. een ingebakken placeholder; alleen de project-ref staat inline) / `20260708000000_member_quiet_hours`. Server-secrets (`VAPID_KEYS`, `CRON_SECRET`, evt. `VAPID_CONTACT`) via `supabase secrets set`, nooit `VITE_`-geprefixt.
- iOS krijgt push alleen als geïnstalleerde PWA (16.4+); `ProfielSheet` toont anders kalme "zet op beginscherm"-uitleg.

### Profiel — `ProfielSheet`
- Eigen weergavenaam/instellingen, meldingen-toggle (gekoppeld aan echte `Notification.permission` via `useNotificationPreference`), uitloggen.
- **Stille uren**-toggle + van/tot-tijdstippen (`store.updateQuietHours`) — per lid, niet per huishouden, zodat elke partner zijn eigen nachtritme instelt zonder de ander te raken. Werkt in beide datamodi (`local` schrijft gewoon naar het lid-record; er is alleen geen server om ook echt push mee te sturen).
- Alleen in `cloud`-modus: een **Wachtwoord**-rij onder Instellingen opent `WachtwoordSheet` (`src/app/sheets/WachtwoordSheet.tsx`) — nieuw wachtwoord + bevestiging via `changePassword` (`AuthProvider` → `supabase.auth.updateUser({ password })`); de lopende sessie is het identiteitsbewijs, dus geen huidig-wachtwoord-herinvoer (Supabase-default). In `local` mode geen account, dus geen rij en `changePassword` is een no-op. Gerenderd op `MainShell`-niveau via de `onOpenWachtwoord`-prop (zelfde sheet-swap als Huishouden), niet genest in `ProfielSheet`.

### Auth & onboarding — `src/app/features/auth/`
- `AuthPage`: e-mail/wachtwoord login + registratie via `AuthForm`, plús een passwordless `MagicLinkForm` erboven — `signInWithMagicLink` (`AuthProvider`) stuurt een Supabase OTP-link (`signInWithOtp`), geen SSO-provider nodig. Layout is een decoratieve full-bleed aquarel-zonsopgang (`LandingHeader`, `src/app/components/LandingHeader.tsx`, `public/landing-header.webp`) met daaronder een zwevende `Card` die met een negatieve marge over de vervagende onderkant van de illustratie omhoogkomt; die kaart draagt het merk (`Logo` + "Cura"-wordmark + subtitel) én het formulier. `LandingHeader` is puur decoratief en rendert niets als het beeld ontbreekt — de branding in de kaart is dan de nette fallback. De verstuurd-staat (bevestigingsmail of magic link) toont een kalm `Mail`-icoon-paneel ("Check je e-mail") in dezelfde kaart. De pagina-container is zelf scrollbaar (`h-dvh overflow-y-auto`) omdat het auth-scherm buiten de vaste `MainShell` valt.
- `OnboardingIntroPage` (`src/app/features/auth/OnboardingIntroPage.tsx`): een korte, eenmalige 3-schermen-intro over de drie pijlers (Vandaag/Routines/Samen, design brief §4.6), getoond vóór `CreateHouseholdPage` zolang de gebruiker nog geen huishouden heeft. Puur device-lokaal via `useOnboardingSeen` (`src/app/lib/useOnboardingSeen.ts`, `localStorage`-key `cura:onboarding-seen`) — geen domeinveld, dus geen sync tussen apparaten of leden; "Overslaan" markeert 'm ook als gezien.
- `CreateHouseholdPage`: "noem je huishouden" voor een ingelogde gebruiker zonder huishouden, na de intro — twee lokale stappen (`naam` → `taken`), niet twee routes. Stap 2 toont vier generieke starttaken (geen kamer, want die bestaat nog niet — `STARTER_TASKS`, twee vooraf geselecteerd) via dezelfde `OptieKaart`-selectie als de kamer-kiezer in `TaskFormFields`. `createHousehold` wordt pas bij het verlaten van stap 2 aangeroepen ("Aan de slag" of "Overslaan"), gevolgd door `createTasksFromTemplates(undefined, ...)` voor de geselecteerde taken (`roomId` is hier verruimd naar `string | undefined` t.o.v. Huis' kamer-quick-add, die altijd een kamer heeft) — zo landt een net aangemaakt huishouden meteen met zichtbare content op Vandaag in plaats van een lege staat, in plaats van pas na een los te bouwen route-stap (die de `Gate`-component in `App.tsx` toch meteen zou overslaan zodra `households.length > 0` wordt).
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
- **Generieke primitieven** leven in `src/app/components/shared.tsx`: `Card` (standaard bg-card/rand/schaduw-kaart-chrome), `KeuzeChip` (elke selecteerbare pill — geen eigen chip-varianten per sheet), plus de knop-/veld-primitieven `PrimaryButton` (volledige-breedte gradient-CTA, glow via `--shadow-cta`), `DubbelKnop`, `PillButton`, `VerwijderKnop` (delete + inline-bevestiging), `IconButton` (ronde icoon-knop), `StatusBadge` (kleine sage-pill), `OptieKaart` (grote selecteerbare `border-2`-tegel voor kamer-grid/interval-presets), `CollapsibleSection` (inklapbare kaart met kop + telbadge + chevron — de accessible name komt puur uit de zichtbare kop/telbadge-tekst, nooit een los `aria-label`, plus `aria-expanded` voor de open/dicht-status; gedeeld door Vandaag's "Afgerond"/"Misschien handig"/"Later vandaag"-secties) en `TaakToevoegRij`.
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
