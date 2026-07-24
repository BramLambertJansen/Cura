-- Optional "Wanneer"-tag on tasks (Ochtend/Middag/Avond) for Vandaag's
-- tijdlijn, fully independent of dueDate/wekker. Nullable, user-chosen —
-- never fabricated (CLAUDE.md §2, honesty over precision).
alter table public.tasks
  add column dagdeel text check (dagdeel in ('ochtend', 'middag', 'avond'));
