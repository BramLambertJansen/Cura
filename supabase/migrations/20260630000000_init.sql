-- ============================================================
-- Cura Phase 3 — cloud schema, RLS, and household/invite RPCs
--
-- IDs are app-generated text (crypto.randomUUID()), matching the
-- domain layer's `Id = z.string().min(1)` (src/data/schemas.ts).
-- Timestamps are timestamptz with NO db default — the app always
-- supplies an ISO string, mirroring LocalStore's exact-string behavior.
--
-- IMPORTANT: completed_by_id / claimed_by_id / created_by_id / owner_id
-- all reference members.id, NOT auth.users.id. members.user_id is the
-- separate, optional link to the auth user. See supabaseStore.ts for
-- the memberIdFor() resolution helper this implies.
-- ============================================================

-- ─── Tables ──────────────────────────────────────────────────

create table public.households (
  id text primary key,
  name text not null
);

create table public.members (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  display_name text not null,
  user_id uuid references auth.users(id) on delete set null
);

-- Scoped (not global) uniqueness: a user can be a member of more than one
-- household in the data model even though the app layer caps it at one
-- (see acceptInvite / create_household below) — CLAUDE.md §3.
create unique index members_household_user_unique
  on public.members(household_id, user_id)
  where user_id is not null;

create table public.household_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id text not null references public.households(id) on delete cascade,
  primary key (user_id, household_id)
);

create table public.household_invites (
  token text primary key,
  household_id text not null references public.households(id) on delete cascade,
  created_by_id text not null references public.members(id) on delete cascade,
  created_at timestamptz not null,
  expires_at timestamptz
);

create table public.rooms (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  icon_key text not null,
  color text not null,
  owner_id text references public.members(id) on delete set null
);

create table public.bundles (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  name text not null,
  trigger text not null,
  cadence text not null check (cadence in ('daily', 'weekly')),
  window_label text not null
);

create table public.tasks (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  room_id text references public.rooms(id) on delete set null,
  title text not null,
  duration_min integer,
  interval_days integer,
  bundle_id text references public.bundles(id) on delete set null,
  claimed_by_id text references public.members(id) on delete set null,
  planned boolean not null default false
);

create table public.task_completions (
  id text primary key,
  task_id text not null references public.tasks(id) on delete cascade,
  completed_by_id text not null references public.members(id) on delete cascade,
  completed_at timestamptz not null
);

create index tasks_household_id_idx on public.tasks(household_id);
create index task_completions_task_id_idx on public.task_completions(task_id);
create index rooms_household_id_idx on public.rooms(household_id);
create index bundles_household_id_idx on public.bundles(household_id);

-- ─── RLS helper ──────────────────────────────────────────────

create or replace function public.is_household_member(hid text)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = hid and hm.user_id = auth.uid()
  );
$$;

-- ─── RLS ─────────────────────────────────────────────────────

alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.rooms enable row level security;
alter table public.bundles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;

-- households / members / household_members: select-only for clients.
-- All writes happen via the security-definer RPCs below — a not-yet-member
-- has no direct INSERT path by design, which is where the one-household
-- cap check belongs.
create policy households_select on public.households
  for select using (public.is_household_member(id));

create policy members_select on public.members
  for select using (public.is_household_member(household_id));

create policy household_members_select on public.household_members
  for select using (public.is_household_member(household_id));

-- household_invites: an existing member can see and create invites for
-- their own household directly; redemption happens via accept_invite().
create policy household_invites_select on public.household_invites
  for select using (public.is_household_member(household_id));

create policy household_invites_insert on public.household_invites
  for insert with check (public.is_household_member(household_id));

-- rooms / bundles / tasks: full CRUD gated on household membership.
create policy rooms_select on public.rooms for select using (public.is_household_member(household_id));
create policy rooms_insert on public.rooms for insert with check (public.is_household_member(household_id));
create policy rooms_update on public.rooms for update using (public.is_household_member(household_id));
create policy rooms_delete on public.rooms for delete using (public.is_household_member(household_id));

create policy bundles_select on public.bundles for select using (public.is_household_member(household_id));
create policy bundles_insert on public.bundles for insert with check (public.is_household_member(household_id));
create policy bundles_update on public.bundles for update using (public.is_household_member(household_id));
create policy bundles_delete on public.bundles for delete using (public.is_household_member(household_id));

create policy tasks_select on public.tasks for select using (public.is_household_member(household_id));
create policy tasks_insert on public.tasks for insert with check (public.is_household_member(household_id));
create policy tasks_update on public.tasks for update using (public.is_household_member(household_id));
create policy tasks_delete on public.tasks for delete using (public.is_household_member(household_id));

-- task_completions: append-only event log. Select/insert gated on
-- membership of the task's household; insert additionally requires
-- completed_by_id to resolve to a member row owned by the caller, so no
-- one can complete a task "as" someone else. Delete is scoped the same
-- way to support uncompleteTask (removing one's own most recent event).
-- No update policy, ever.
create policy task_completions_select on public.task_completions
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_completions.task_id and public.is_household_member(t.household_id)
    )
  );

create policy task_completions_insert on public.task_completions
  for insert with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_completions.task_id and public.is_household_member(t.household_id)
    )
    and exists (
      select 1 from public.members m
      where m.id = task_completions.completed_by_id and m.user_id = auth.uid()
    )
  );

create policy task_completions_delete on public.task_completions
  for delete using (
    exists (
      select 1 from public.members m
      where m.id = task_completions.completed_by_id and m.user_id = auth.uid()
    )
  );

-- ─── RPCs ────────────────────────────────────────────────────

-- create_household: for a signed-in user with zero households (the
-- "create your first household" onboarding screen). Atomically creates
-- the household, the creator's member row, and the household_members
-- junction row. Rejects if the caller is already in a household —
-- mirrors the cap enforced in accept_invite below.
create or replace function public.create_household(
  p_household_id text,
  p_household_name text,
  p_member_id text,
  p_display_name text
)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'already_member';
  end if;

  insert into public.households (id, name) values (p_household_id, p_household_name);
  insert into public.members (id, household_id, display_name, user_id)
    values (p_member_id, p_household_id, p_display_name, auth.uid());
  insert into public.household_members (user_id, household_id)
    values (auth.uid(), p_household_id);
end;
$$;

-- accept_invite: redeems an invite token for the calling user. Returns a
-- typed result instead of throwing — "already a member" / "invalid" /
-- "expired" are expected outcomes, not exceptional ones, matching the
-- DataStore.acceptInvite() contract (src/data/store.ts).
create or replace function public.accept_invite(
  p_token text,
  p_member_id text,
  p_display_name text
)
returns jsonb language plpgsql security definer
set search_path = public as $$
declare
  inv record;
begin
  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    return jsonb_build_object('ok', false, 'reason', 'already_member');
  end if;

  select * into inv from public.household_invites where token = p_token;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid');
  end if;

  if inv.expires_at is not null and inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  insert into public.members (id, household_id, display_name, user_id)
    values (p_member_id, inv.household_id, p_display_name, auth.uid());
  insert into public.household_members (user_id, household_id)
    values (auth.uid(), inv.household_id);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.create_household(text, text, text, text) to authenticated;
grant execute on function public.accept_invite(text, text, text) to authenticated;
