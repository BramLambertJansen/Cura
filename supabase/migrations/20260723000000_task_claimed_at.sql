-- When a task's claimed_by_id was last set. Lets Vandaag tell a Huis-pool
-- task claimed minutes ago ("Vandaag opgepakt") apart from one that's been
-- planned/claimed for days — see splitPickedUpToday in src/data/selectors.ts.
alter table public.tasks
  add column claimed_at timestamptz;
