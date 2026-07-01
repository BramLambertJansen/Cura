-- ============================================================
-- Cura — add task description (free-form note). Applied manually
-- via the Supabase Dashboard SQL editor, same as the other
-- migrations in this repo (CLAUDE.md §4) — no live DB access in
-- this sandbox, so this file is written but not run automatically.
-- ============================================================

alter table public.tasks add column description text;
