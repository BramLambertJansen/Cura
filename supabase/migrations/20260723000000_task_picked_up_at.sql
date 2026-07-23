-- Set only when a task is claimed via Huis's pool-claim action (never by the
-- generic planned-auto-claim). Lets Vandaag tell a Huis-pool task picked up
-- minutes ago ("Vandaag opgepakt") apart from one planned/claimed some other
-- way — see splitPickedUpToday in src/data/selectors.ts.
alter table public.tasks
  add column picked_up_at timestamptz;
