-- ============================================================
-- Cura Phase 3 follow-ups — household rename, invite hardening,
-- missing indexes. Applied manually via the Supabase Dashboard SQL
-- editor, same as 20260630000000_init.sql (CLAUDE.md §4).
-- ============================================================

-- ─── Households: allow a member to rename their own household ──
-- Consistent with rooms/bundles/tasks, which already allow direct
-- CRUD gated on is_household_member() rather than going through an
-- RPC — a rename carries no invariant worth a security-definer function.
create policy households_update on public.households
  for update using (public.is_household_member(id)) with check (public.is_household_member(id));

-- ─── Invites: revocable + single-use ────────────────────────────
-- A member can delete an invite for their own household (revoke an
-- unredeemed link). accept_invite() below additionally deletes the
-- row itself on successful redemption, so a link only ever works once.
create policy household_invites_delete on public.household_invites
  for delete using (public.is_household_member(household_id));

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

  -- Single-use: the link stops working the moment it's redeemed.
  delete from public.household_invites where token = p_token;

  return jsonb_build_object('ok', true);
end;
$$;

-- ─── Missing indexes ─────────────────────────────────────────────
-- members_household_user_unique (init.sql) is a partial index on
-- (household_id, user_id) where user_id is not null — not usable for
-- a plain "members of this household" lookup (listMembers/memberIdFor).
create index members_household_id_idx on public.members(household_id);

-- listCompletions / uncompleteTask order/filter by completed_at.
create index task_completions_completed_at_idx on public.task_completions(completed_at);
