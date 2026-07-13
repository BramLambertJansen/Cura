# Cura design system — building with these components

Cura is a calm, shared household planner for two people (React 19 + Tailwind v4 +
shadcn/Radix). **UI language is Dutch**; the tone is warm, forgiving, never
competitive. Deliberately avoid: summary percentages ("78% opgeruimd"), hard
streaks ("12 dagen op rij"), person-vs-person scoreboards, and alarming/overdue
red states. Prefer soft, honest phrasing ("Waarschijnlijk weer toe").

## Setup & wrapping
- **Styling needs no provider.** Components are pre-styled by the shipped
  stylesheet (tokens + Tailwind utilities). Just ensure `styles.css` is loaded.
- **Router context:** `RoutineKaart`, `RoutineKaartCompact`, and `FocusMiniPill`
  call `useNavigate`, so render them inside a react-router router (e.g. wrap the
  screen in `<MemoryRouter>` / `<BrowserRouter>`), or they throw.
- **Toasts:** feedback uses `sonner` — mount its `<Toaster/>` once at the app root
  if you use toast-driven components (`ConnectivityBanner`, `UpdatePrompt`).
- **App shell:** Cura is a fixed, full-bleed PWA layer on the cream
  `bg-background`, NOT a scrolling document — only the content area scrolls, a
  bottom nav sits at the bottom, and `Sheet` overlays render at shell level
  (absolute) over the content.

## Styling idiom — Tailwind utilities bound to Cura tokens
Style with these utility families (all defined in the DS stylesheet). Don't invent
hex values or hand-roll buttons/cards — compose the components below and use these
classes only for layout glue.

| Purpose | Classes |
|---|---|
| Surfaces | `bg-background` (cream page), `bg-card` (warm white), `bg-card-active` (warmer day-view card), `bg-card-room`, `bg-secondary`, `bg-muted`, `bg-accent` |
| Text | `text-foreground`, `text-muted-foreground`, `text-primary` (sage), `text-white` (on the sage CTA) |
| Brand / primary | sage `--primary` (#496E46); the full-width CTA uses the `--gradient-primary` gradient (via `PrimaryButton`) |
| Borders / radius | `border-border`; the calm look is large radii — `rounded-2xl`, `rounded-3xl`, `rounded-full` |
| Typography | body is Plus Jakarta Sans (default); headings & numeric displays use the `font-display` utility (Lora serif), often `italic` for soft hints |
| Focus | the `focus-ring` utility (a 2px sage halo) — don't hand-type focus-visible chains |

Derived tints follow `color-mix(in srgb, var(--token) X%, transparent)` — reuse a
token rather than a new color.

## Compose Cura's own components (don't rebuild them)
- Primitives (`components/general/…`): `Card`, `PrimaryButton`, `DubbelKnop`,
  `PillButton`, `IconButton`, `KeuzeChip`, `StatusBadge`, `Checkbox`, `Toggle`,
  `VeldInput`, `VeldTextarea`, `Sheet`, `PageHeader`, `Kop`, `Leeg`, `HintBanner`.
- Domain rows/cards take a plain view-model object (see each `.d.ts`): `TaakRij`
  and `TijdlijnTaakRij` take a `TaskView`; `KamerKaart` a `RoomView`;
  `RoutineKaart`/`RoutineKaartCompact` a `RoutineView`; `BoodschapRij` a
  `ShoppingItemView`; `SuggestieRij` a `TaskView`. These are display models —
  construct literals, don't fetch.
- Room art degrades gracefully: `KamerKaart`/`RoomThumb`/`RoomArt` show a tinted
  wash + line icon when the room's `iconKey` has no watercolor asset present.

## Where the truth lives
Read the bound stylesheet (`styles.css` and its `@import` closure, incl. the
`:root` token block) before styling, and each component's `.d.ts` (props) +
`.prompt.md` (usage) before composing it.

## Idiomatic snippet
```tsx
import { PageHeader, Card, TaakRij, PrimaryButton } from 'cura';

function Vandaag() {
  return (
    <div className="bg-background min-h-full px-5 pt-14">
      <PageHeader title="Vandaag" subtitle="Nog twee taken te gaan." />
      <div className="bg-card-active border border-border rounded-2xl p-1 space-y-1">
        <TaakRij task={{ id: '1', title: 'Aanrecht afnemen', room: 'Keuken', duration: '5 min', planned: true, done: false }} onToggle={() => {}} onEdit={() => {}} />
        <TaakRij task={{ id: '2', title: 'Planten water geven', room: 'Woonkamer', done: false, planned: false }} onToggle={() => {}} onEdit={() => {}} />
      </div>
      <div className="mt-6"><PrimaryButton onClick={() => {}}>Taak toevoegen</PrimaryButton></div>
    </div>
  );
}
```
