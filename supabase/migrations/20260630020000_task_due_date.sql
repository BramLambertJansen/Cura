-- ============================================================
-- Cura — add task wekker (deadline/reminder). Applied manually
-- via the Supabase Dashboard SQL editor, same as the other
-- migrations in this repo (CLAUDE.md §4) — no live DB access in
-- this sandbox, so this file is written but not run automatically.
-- ============================================================

-- Eenmalige taken: due_date is de volledige deadline (datum + tijd).
-- Terugkerende taken (interval_days gezet): alleen het tijdstip-deel van
-- due_date wordt door de app gelezen (een dagelijkse wekkertijd) — de datum
-- zelf draagt geen betekenis en wordt niet vergeleken of getoond.
alter table public.tasks add column due_date timestamptz;
