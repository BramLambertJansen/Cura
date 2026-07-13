-- Checklist subtasks + a manual/auto "started" timestamp on tasks. Status
-- itself stays derived (view layer, toTaskView in src/data/selectors.ts) —
-- this only adds the two raw facts it's computed from.
alter table public.tasks
  add column started_at timestamptz,
  add column checklist_items jsonb not null default '[]'::jsonb;
