-- ============================================================
-- Cura — allow a member to rename their own display name. Applied
-- manually via the Supabase Dashboard SQL editor, same as the other
-- migrations in this repo (CLAUDE.md §4).
-- ============================================================

-- ─── Members: self-service display-name edit ────────────────────
-- members was select-only for clients (init.sql) — every other write
-- to it happens via the security-definer RPCs. A profile rename carries
-- no invariant worth an RPC, so this mirrors households_update: gated
-- on owning the row (user_id = auth.uid()) rather than membership.
create policy members_update on public.members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
