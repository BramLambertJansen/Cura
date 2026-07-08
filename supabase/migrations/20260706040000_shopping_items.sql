-- ============================================================
-- Boodschappenlijst (shopping list). Applied manually via the
-- Supabase Dashboard SQL editor, same as every prior migration
-- (CLAUDE.md §4).
--
-- `checked` is a plain stored boolean, deliberately NOT event-sourced
-- like task completions — a shopping item has no recurrence/density
-- story and never appears in the Samen feed (CLAUDE.md §5
-- "Boodschappenlijst").
-- ============================================================

create table public.shopping_items (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  title text not null,
  quantity text,
  checked boolean not null default false,
  created_at timestamptz not null default now()
);

create index shopping_items_household_id_idx on public.shopping_items(household_id);

alter table public.shopping_items enable row level security;

create policy shopping_items_select on public.shopping_items for select using (public.is_household_member(household_id));
create policy shopping_items_insert on public.shopping_items for insert with check (public.is_household_member(household_id));
create policy shopping_items_update on public.shopping_items for update using (public.is_household_member(household_id));
create policy shopping_items_delete on public.shopping_items for delete using (public.is_household_member(household_id));

alter publication supabase_realtime add table public.shopping_items;
