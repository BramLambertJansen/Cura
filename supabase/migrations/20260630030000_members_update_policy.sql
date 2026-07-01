-- ============================================================
-- Cura — allow a member to rename themselves. Applied manually
-- via the Supabase Dashboard SQL editor, same as the other
-- migrations in this repo (CLAUDE.md §4) — no live DB access in
-- this sandbox, so this file is written but not run automatically.
-- ============================================================

-- members previously had a select-only policy (init.sql) — any write went
-- via security-definer RPCs (create_household/accept_invite). Editing your
-- own display name doesn't need the one-household-cap guarantees those RPCs
-- exist for, so a direct self-only update policy is enough here.
create policy members_update on public.members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
