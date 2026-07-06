-- ============================================================
-- Cura — reminder scheduler (pg_cron + pg_net → send-reminders edge function)
--
-- Runs every minute (recurring wekkers are HH:mm-precise) and POSTs to the
-- send-reminders edge function, which computes what's due, dedups via
-- reminder_dispatches, and sends the Web Push. A second weekly job prunes old
-- dedup rows.
--
-- MANUAL STEP: this migration is applied by hand via the Supabase SQL editor
-- (like the others). Before running it, replace the two placeholders below:
--   __PROJECT_REF__  → your project ref (the xxxx in https://xxxx.supabase.co)
--   __CRON_SECRET__  → the same value you set via `supabase secrets set CRON_SECRET=...`
-- Keeping the secret in the cron command (server-side, not in the repo) is the
-- standard pattern; alternatively store both in Vault and read via
-- vault.decrypted_secrets if you prefer not to inline them.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Fire the scheduler every minute.
select cron.schedule(
  'cura-send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://vhsohqmpforqshsvcwpb.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '__CRON_SECRET__'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Keep the dedup log small — one wekker per day per task, but it accumulates.
select cron.schedule(
  'cura-prune-reminder-dispatches',
  '17 4 * * 0', -- Sundays 04:17
  $$
  delete from public.reminder_dispatches where dispatched_at < now() - interval '30 days';
  $$
);
