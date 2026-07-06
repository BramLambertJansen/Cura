-- ============================================================
-- Cura — Web Push subscriptions
--
-- One row per browser/device that opted in to reminders. The server-side
-- scheduler (the send-reminders edge function, running as the service role)
-- reads these to deliver wekker-reminders when the app is closed.
--
-- IMPORTANT: member_id references members.id, NOT auth.users.id — matching
-- every other ownership column in the schema (see init.sql). endpoint is the
-- push service's per-subscription URL and is the natural unique identity; the
-- client upserts on it so re-subscribing the same browser refreshes its keys.
-- ============================================================

create table public.push_subscriptions (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  member_id text not null references public.members(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null
);

create index push_subscriptions_household_id_idx on public.push_subscriptions(household_id);

alter table public.push_subscriptions enable row level security;

-- A household member can see subscriptions for their own household, and
-- insert/update ones tied to their OWN member row (member_id must resolve to a
-- member owned by the caller) — so no one can register a push endpoint "as"
-- someone else (mirrors task_completions_insert in init.sql). The client
-- upserts on `endpoint`, so both INSERT and UPDATE policies are required for
-- the on-conflict path to satisfy RLS.
create policy push_subscriptions_select on public.push_subscriptions
  for select using (public.is_household_member(household_id));

create policy push_subscriptions_insert on public.push_subscriptions
  for insert with check (
    public.is_household_member(household_id)
    and exists (
      select 1 from public.members m
      where m.id = push_subscriptions.member_id and m.user_id = auth.uid()
    )
  );

create policy push_subscriptions_update on public.push_subscriptions
  for update
  using (public.is_household_member(household_id))
  with check (
    public.is_household_member(household_id)
    and exists (
      select 1 from public.members m
      where m.id = push_subscriptions.member_id and m.user_id = auth.uid()
    )
  );

create policy push_subscriptions_delete on public.push_subscriptions
  for delete using (public.is_household_member(household_id));
