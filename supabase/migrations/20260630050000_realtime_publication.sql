-- ============================================================
-- Cura — enable Realtime (Phase 3+, cloud mode) for the tables
-- SupabaseStore.subscribeToChanges subscribes to. Applied manually
-- via the Supabase Dashboard SQL editor, same as the other
-- migrations in this repo (CLAUDE.md §4) — no live DB access in
-- this sandbox, so this file is written but not run automatically.
--
-- Without this, postgres_changes never fires for these tables —
-- being in the publication is separate from (and in addition to)
-- the RLS policies from init.sql, which gate WHO sees an event
-- once the table IS publishing them.
-- ============================================================

alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.bundles;
alter publication supabase_realtime add table public.members;
alter publication supabase_realtime add table public.task_completions;
