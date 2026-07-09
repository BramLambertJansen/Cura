-- ============================================================
-- Cura — per-member quiet hours (hold back push during a window)
--
-- Nullable "HH:mm" text columns; both set = enabled for that member. Read by
-- the send-reminders edge function (joined from push_subscriptions) and by
-- the in-app poller (useTaskReminders) for the signed-in member — see
-- isWithinQuietHours in src/data/reminders.ts.
--
-- No new RLS policy needed: members_update (20260630030000) is already a
-- column-agnostic "update your own member row" policy.
-- ============================================================

alter table public.members
  add column quiet_hours_start text,
  add column quiet_hours_end text;
