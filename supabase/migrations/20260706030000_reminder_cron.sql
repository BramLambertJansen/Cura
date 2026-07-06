-- ============================================================
-- Cura — reminder scheduler (pg_cron + pg_net → send-reminders edge function)
--
-- Runs every minute (recurring wekkers are HH:mm-precise) and POSTs to the
-- send-reminders edge function, which computes what's due, dedups via
-- reminder_dispatches, and sends the Web Push. A second weekly job prunes old
-- dedup rows.
--
-- The shared CRON_SECRET is read from Supabase Vault at each tick instead of
-- being inlined here — so no secret lives in the repo, and there is no
-- placeholder left to forget (a stale placeholder makes the edge function
-- return 401 forever and silently sends nothing).
--
-- MANUAL STEP: applied by hand via the Supabase SQL editor (like the others).
-- Before/after running it, create the Vault secret ONCE with the SAME value you
-- pass to `supabase secrets set CRON_SECRET=...` (the edge function compares the
-- two), e.g. in the SQL editor:
--
--   select vault.create_secret('<your-random-cron-secret>', 'cura_cron_secret');
--   -- rotate later with:
--   -- select vault.update_secret(
--   --   (select id from vault.secrets where name = 'cura_cron_secret'),
--   --   '<new-secret>');
--
-- The project ref below is this project's (the xxxx in https://xxxx.supabase.co);
-- change it only if you point this at a different project.
-- ============================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;

-- Fire the scheduler every minute. The x-cron-secret header is resolved from
-- Vault on every run, so rotating the secret needs no re-scheduling — just
-- vault.update_secret plus the matching `supabase secrets set CRON_SECRET`.
select cron.schedule(
  'cura-send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://vhsohqmpforqshsvcwpb.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'cura_cron_secret'
      )
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
