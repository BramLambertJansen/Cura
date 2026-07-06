-- ============================================================
-- Cura — household timezone (for push-notification scheduling)
--
-- Recurring wekkers encode only an HH:mm. The in-app poller and the
-- server-side push scheduler both compute "today at HH:mm" in this IANA zone,
-- so their dedup key (DueReminder.firedForKey) matches exactly. Without an
-- explicit zone the UTC edge function would fire recurring reminders at the
-- wrong wall-clock time and roll the daily key at UTC midnight.
--
-- Default 'Europe/Amsterdam' matches the app's Dutch, single-timezone
-- two-person household. Mirrors the .default() on HouseholdSchema
-- (src/data/schemas.ts) so local and cloud agree.
-- ============================================================

alter table public.households
  add column time_zone text not null default 'Europe/Amsterdam';
