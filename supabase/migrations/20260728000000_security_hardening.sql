-- ============================================================
-- Cura — security hardening from the security review (#164-167).
-- Applied manually via the Supabase Dashboard SQL editor, same as
-- every other migration in this repo (CLAUDE.md §4).
-- ============================================================

-- ─── #164: one-household cap + single-use invite, race-proofed ───
-- A hard, table-level backstop independent of any RPC logic: two
-- concurrent accept_invite/create_household calls for the same user
-- (different tokens/households) can both pass an unlocked "already a
-- member?" check before either INSERT commits. This constraint makes
-- the second INSERT fail outright instead of silently succeeding.
alter table public.household_members
  add constraint household_members_user_id_unique unique (user_id);

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
exception
  when unique_violation then
    raise exception 'already_member';
end;
$$;

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

  -- Lock the invite row for the rest of this transaction: a second,
  -- concurrent redemption of the SAME token now blocks here instead of
  -- both racing past this SELECT before the DELETE at the end removes it.
  select * into inv from public.household_invites where token = p_token for update;
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

  -- Single-use: the link stops working the moment it's redeemed.
  delete from public.household_invites where token = p_token;

  return jsonb_build_object('ok', true);
exception
  -- Two DIFFERENT tokens (different households) redeemed concurrently by
  -- the same user both pass the "already_member" check above before
  -- either commits — the FOR UPDATE lock only serializes same-token
  -- redemptions. household_members_user_id_unique above is the backstop
  -- for this case.
  when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'already_member');
end;
$$;

-- ─── #165: members_update let a caller move their OWN row to a
-- different household_id (RLS has no column granularity — "using/with
-- check (user_id = auth.uid())" restricts which ROW, not which COLUMNS).
-- Replaced with a security-definer RPC that only ever touches the
-- caller's own row and only the two columns ProfielSheet actually edits.
drop policy if exists members_update on public.members;

create or replace function public.update_own_member(
  p_display_name text default null,
  p_set_quiet_hours boolean default false,
  p_quiet_hours_start text default null,
  p_quiet_hours_end text default null
)
returns public.members
language plpgsql security definer
set search_path = public as $$
declare
  result public.members;
begin
  update public.members
  set
    display_name = coalesce(p_display_name, display_name),
    quiet_hours_start = case when p_set_quiet_hours then p_quiet_hours_start else quiet_hours_start end,
    quiet_hours_end = case when p_set_quiet_hours then p_quiet_hours_end else quiet_hours_end end
  where user_id = auth.uid()
  returning * into result;

  if result.id is null then
    raise exception 'member_not_found';
  end if;

  return result;
end;
$$;

grant execute on function public.update_own_member(text, boolean, text, text) to authenticated;

-- ─── #166: tasks_update/rooms_update never validated that
-- claimed_by_id/owner_id point at a member of the SAME household — only
-- that the task/room itself does. Add the missing with-check.
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (public.is_household_member(household_id))
  with check (
    public.is_household_member(household_id)
    and (claimed_by_id is null or exists (
      select 1 from public.members m where m.id = tasks.claimed_by_id and m.household_id = tasks.household_id
    ))
  );

drop policy if exists rooms_update on public.rooms;
create policy rooms_update on public.rooms
  for update using (public.is_household_member(household_id))
  with check (
    public.is_household_member(household_id)
    and (owner_id is null or exists (
      select 1 from public.members m where m.id = rooms.owner_id and m.household_id = rooms.household_id
    ))
  );

-- ─── #167: invite expiry (7 days) was a client-computed timestamp with
-- nothing server-side enforcing it — a direct insert could set expires_at
-- to null (never expires) or years out. Moved to a security-definer RPC
-- that derives created_at/expires_at from now() and ignores client
-- timestamps entirely, consistent with create_household/accept_invite
-- already not trusting client input for anything security-relevant.
-- The direct insert policy is no longer needed now that the RPC is the
-- only path — dropping it closes the gap outright instead of relying on
-- a check constraint a future column change could loosen.
drop policy if exists household_invites_insert on public.household_invites;

create or replace function public.create_invite(
  p_token text,
  p_household_id text
)
returns public.household_invites
language plpgsql security definer
set search_path = public as $$
declare
  result public.household_invites;
  creator_id text;
begin
  if not public.is_household_member(p_household_id) then
    raise exception 'not_a_member';
  end if;

  select id into creator_id from public.members
    where household_id = p_household_id and user_id = auth.uid()
    limit 1;
  if creator_id is null then
    raise exception 'not_a_member';
  end if;

  insert into public.household_invites (token, household_id, created_by_id, created_at, expires_at)
    values (p_token, p_household_id, creator_id, now(), now() + interval '7 days')
    returning * into result;

  return result;
end;
$$;

grant execute on function public.create_invite(text, text) to authenticated;
