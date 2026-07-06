-- ============================================================
-- Cura — reminder dedup log (server-side)
--
-- The send-reminders edge function (service role) atomically claims a reminder:
--
--   insert into public.reminder_dispatches (fired_for_key)
--   values ($1) on conflict (fired_for_key) do nothing returning fired_for_key;
--
-- and only sends the push when a row was actually inserted, so overlapping
-- cron ticks (or a retry) can never double-send. fired_for_key mirrors
-- DueReminder.firedForKey (src/data/reminders.ts): task.id for a one-off,
-- `${task.id}:yyyy-mm-dd` (household-local date) for a recurring wekker — a new
-- day yields a new key, so the daily reminder fires once per day.
--
-- RLS is ENABLED with NO policies on purpose: authenticated/anon clients can
-- neither read nor write this table; only the service role (which bypasses
-- RLS) touches it. Rows are pruned by a weekly cron (see the reminder-cron
-- migration).
-- ============================================================

create table public.reminder_dispatches (
  fired_for_key text primary key,
  dispatched_at timestamptz not null default now()
);

create index reminder_dispatches_dispatched_at_idx on public.reminder_dispatches(dispatched_at);

alter table public.reminder_dispatches enable row level security;
