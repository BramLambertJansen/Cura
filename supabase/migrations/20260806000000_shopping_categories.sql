-- ============================================================
-- Boodschap-categorieën aanpasbaar maken. Applied manually via the
-- Supabase Dashboard SQL editor, same as every prior migration
-- (CLAUDE.md §4).
--
-- Categories become a household-shared, fully user-managed entity
-- (add / rename / delete / reorder) — architecturally a near-copy
-- of `rooms` (no icon/color, since a category is a text pill in a
-- section header, not a card; `sort_order` drives the display/
-- reorder order, which rooms have no equivalent of). The old
-- title-based keyword auto-categorization is gone from the app —
-- the user always picks a category explicitly.
--
-- New households get their default categories seeded client-side
-- (CreateHouseholdPage.tsx, after create_household), same pattern
-- as its starter rooms/tasks. This migration only needs to backfill
-- EXISTING households, which never went through that onboarding step.
-- ============================================================

create table public.categories (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

create index categories_household_id_idx on public.categories(household_id);

alter table public.categories enable row level security;

create policy categories_select on public.categories for select using (public.is_household_member(household_id));
create policy categories_insert on public.categories for insert with check (public.is_household_member(household_id));
create policy categories_update on public.categories for update using (public.is_household_member(household_id));
create policy categories_delete on public.categories for delete using (public.is_household_member(household_id));

alter publication supabase_realtime add table public.categories;

-- ─── Backfill for existing households ───────────────────────────

-- Seed the five starter categories for every household that doesn't
-- have any yet (i.e. every household that already existed before this
-- migration — a household created afterwards gets its categories from
-- CreateHouseholdPage instead, so this insert becomes a no-op there).
insert into public.categories (id, household_id, name, sort_order)
select gen_random_uuid()::text, h.id, c.name, c.sort_order
from public.households h
cross join (values
  ('Vers', 0),
  ('Koeling', 1),
  ('Voorraad', 2),
  ('Huis', 3),
  ('Overig', 4)
) as c(name, sort_order)
where not exists (select 1 from public.categories existing where existing.household_id = h.id);

alter table public.shopping_items
  add column category_id text references public.categories(id) on delete set null;

-- Point each existing shopping item at its household's matching new
-- category, translating the old enum key to the label it displayed as.
update public.shopping_items si
set category_id = c.id
from public.categories c
where c.household_id = si.household_id
  and c.name = case si.category
    when 'fresh' then 'Vers'
    when 'cold' then 'Koeling'
    when 'pantry' then 'Voorraad'
    when 'household' then 'Huis'
    else 'Overig'
  end;

alter table public.shopping_items drop column category;
