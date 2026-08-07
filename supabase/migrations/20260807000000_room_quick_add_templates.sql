-- Household-managed override of the static per-category "Snel toevoegen"
-- suggestions on a room (CLAUDE.md §5 Huis). Empty by default: an
-- unmanaged room keeps falling back to ROOM_TEMPLATES (templates.ts).
-- No RLS change needed — the existing rooms_update policy (household
-- membership) already covers this column.

alter table public.rooms
  add column quick_add_templates jsonb not null default '[]'::jsonb;
