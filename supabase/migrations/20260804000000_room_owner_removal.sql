-- Removes the room "soft owner" feature entirely (CLAUDE.md §5 Huis no
-- longer documents it, and the app never reads/writes owner_id anymore).
-- A room is a pool; nobody is "meestal" responsible for it.

-- The rooms_update with-check (20260728000000_security_hardening.sql,
-- #166) references owner_id, so it must be dropped/recreated around the
-- column drop.
drop policy if exists rooms_update on public.rooms;

alter table public.rooms drop column if exists owner_id;

create policy rooms_update on public.rooms
  for update using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
