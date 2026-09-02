-- ============================================================
-- Cura Phase 4 — AI-invoer via MCP-server: task_suggestions +
-- mcp_access_tokens. Applied manually via the Supabase Dashboard SQL
-- editor, same as every other migration in this repo (CLAUDE.md §4).
--
-- Three trust boundaries meet in this feature (see the mcp-server edge
-- function, supabase/functions/mcp-server/index.ts, and CLAUDE.md §5
-- "AI-voorstellen" for the full reasoning):
--   - task_suggestions: normal client reads happen under RLS like any
--     other household-scoped table. The ONLY write path is the
--     mcp-server edge function, which authenticates the caller ITSELF
--     (a bearer MCP token, not a Supabase session/JWT) and writes with
--     the service-role key — RLS is bypassed there by design, so this
--     table deliberately has NO insert/update policy for
--     anon/authenticated at all. Delete (both "afwijzen" and, after a
--     successful createTask, "accepteren") IS a normal, RLS-gated
--     client action.
--   - mcp_access_tokens: read/list via normal RLS (any household member
--     may see label/created-by/created-at/last-used/revoked-at — never
--     the hash, which the client-facing SupabaseStore.listMcpTokens()
--     simply never selects). Minting and revoking go through
--     security-definer RPCs, exactly the create_invite/revoke_invite
--     pattern from 20260630000000_init.sql /
--     20260728000000_security_hardening.sql, so a client key can never
--     insert/update this table directly either.
--
-- pgcrypto is required for the token secret itself (gen_random_bytes)
-- and its hash (digest) inside create_mcp_token below. Supabase hosted
-- projects install extensions into the `extensions` schema by default —
-- naming it explicitly here means a fresh project gets it there too,
-- rather than defaulting to `public` — and create_mcp_token's own
-- search_path includes BOTH schemas (review finding), so this resolves
-- correctly whether pgcrypto ends up newly installed here or was already
-- present in either schema on an existing project (`if not exists` is a
-- no-op by extension name regardless of which schema it already lives in).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ─── Tables ──────────────────────────────────────────────────

create table public.task_suggestions (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  title text not null,
  -- Must be an existing Room in this household when set — enforced by the
  -- mcp-server edge function at write time (defense-in-depth, since that
  -- function bypasses RLS via the service role). A suggestion never creates
  -- a new room (CLAUDE.md §5 → AI-voorstellen decision 1).
  room_id text references public.rooms(id) on delete set null,
  duration_min integer,
  due_date_suggestion timestamptz,
  dagdeel_suggestion text check (dagdeel_suggestion in ('ochtend', 'middag', 'avond')),
  -- Always shown, never empty (§2 honesty over precision) — the "why" behind
  -- a suggestion, e.g. "uit e-mail over de tandarts".
  source_note text not null,
  created_by_member_id text not null references public.members(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index task_suggestions_household_id_idx on public.task_suggestions(household_id);

create table public.mcp_access_tokens (
  id text primary key,
  household_id text not null references public.households(id) on delete cascade,
  label text not null,
  created_by_member_id text not null references public.members(id) on delete cascade,
  -- sha-256 hash (hex) of the raw secret — the raw value itself is NEVER
  -- stored anywhere, client or server, and is returned to the caller
  -- exactly once at creation time (create_mcp_token below). Never selected
  -- by the client-facing app code (SupabaseStore.listMcpTokens()).
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  -- Soft-revoke only — never a delete, so "Voorgesteld door …" attribution
  -- on suggestions this token already made stays truthful after revocation.
  revoked_at timestamptz,
  last_used_at timestamptz,
  -- Rate-limit bookkeeping for the mcp-server edge function (CLAUDE.md §5 →
  -- AI-voorstellen decision 4): a rolling 24h window, reset once older than
  -- that. Server-only — never selected by the client-facing listMcpTokens().
  window_started_at timestamptz,
  requests_in_window integer not null default 0
);

create index mcp_access_tokens_household_id_idx on public.mcp_access_tokens(household_id);

-- ─── RLS ─────────────────────────────────────────────────────
-- Both tables get RLS force-enabled automatically at CREATE TABLE time by
-- the rls_auto_enable() event trigger (20260728010000_ensure_rls_event_
-- trigger.sql) — the explicit `alter table ... enable row level security`
-- below is belt-and-braces, confirming rather than assuming that, per that
-- migration's own guidance.
alter table public.task_suggestions enable row level security;
alter table public.mcp_access_tokens enable row level security;

create policy task_suggestions_select on public.task_suggestions
  for select using (public.is_household_member(household_id));

create policy task_suggestions_delete on public.task_suggestions
  for delete using (public.is_household_member(household_id));

create policy mcp_access_tokens_select on public.mcp_access_tokens
  for select using (public.is_household_member(household_id));

-- ─── RPCs ────────────────────────────────────────────────────

-- create_mcp_token: mints a new token for a household. Generates the raw
-- secret AND its hash server-side (never trust a client-supplied secret,
-- same lesson as create_invite's server-derived expires_at) — only the
-- hash is persisted, and the raw value is returned in this one response,
-- never retrievable again after this call.
create or replace function public.create_mcp_token(
  p_household_id text,
  p_label text
)
returns jsonb language plpgsql security definer
-- Both schemas: pgcrypto's gen_random_bytes/digest live in `extensions`
-- (see the create extension comment above), but a search_path restricted to
-- only `public` made those calls unqualified-unresolvable at runtime on a
-- project where pgcrypto sits in `extensions` (review finding) — this
-- function is the only one in this file that needs pgcrypto.
set search_path = public, extensions as $$
declare
  new_id text;
  raw_token text;
  hashed text;
  creator_id text;
  result public.mcp_access_tokens;
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

  new_id := encode(gen_random_bytes(16), 'hex');
  raw_token := encode(gen_random_bytes(32), 'hex');
  hashed := encode(digest(raw_token, 'sha256'), 'hex');

  insert into public.mcp_access_tokens (id, household_id, label, created_by_member_id, token_hash, created_at)
    values (new_id, p_household_id, p_label, creator_id, hashed, now())
    returning * into result;

  return jsonb_build_object(
    'token', jsonb_build_object(
      'id', result.id,
      'household_id', result.household_id,
      'label', result.label,
      'created_by_member_id', result.created_by_member_id,
      'created_at', result.created_at,
      'last_used_at', result.last_used_at,
      'revoked_at', result.revoked_at
    ),
    'raw_token', raw_token
  );
end;
$$;

grant execute on function public.create_mcp_token(text, text) to authenticated;

-- revoke_mcp_token: soft-revoke only (sets revoked_at, never a delete) —
-- see the mcp_access_tokens.revoked_at comment above for why.
create or replace function public.revoke_mcp_token(
  p_token_id text
)
returns void language plpgsql security definer
set search_path = public as $$
declare
  target_household_id text;
begin
  select household_id into target_household_id from public.mcp_access_tokens where id = p_token_id;
  if target_household_id is null or not public.is_household_member(target_household_id) then
    raise exception 'not_a_member';
  end if;

  update public.mcp_access_tokens set revoked_at = now() where id = p_token_id;
end;
$$;

grant execute on function public.revoke_mcp_token(text) to authenticated;

-- bump_mcp_rate_limit: atomic check-and-increment for the mcp-server edge
-- function's rolling-window rate limit (CLAUDE.md §5 → AI-voorstellen,
-- SUGGESTIONS_PER_TOKEN_PER_DAY in mcp-server/index.ts). Replaces an
-- earlier read-then-write in application code: two round trips let
-- concurrent suggest_task calls all read the same counter, all pass the
-- check, and all write the same incremented value — defeating the cap
-- (review finding). A single UPDATE statement is atomic against that race:
-- concurrent updates to the same row serialize on Postgres' row lock, so
-- the second call's WHERE/SET always sees the first call's committed
-- result, never a stale read.
--
-- Called by the edge function with the SERVICE ROLE key (never a client
-- session), and takes no household/member context of its own — it must
-- never be reachable by anon/authenticated, hence the explicit revoke+grant
-- below, unlike create_mcp_token/revoke_mcp_token, which check
-- is_household_member themselves and are meant for authenticated clients.
create or replace function public.bump_mcp_rate_limit(
  p_token_id text,
  p_limit integer,
  p_window_ms bigint
)
returns boolean language plpgsql security definer
set search_path = public as $$
declare
  did_update boolean;
begin
  update public.mcp_access_tokens
  set
    window_started_at = case
      when window_started_at is null or now() - window_started_at >= make_interval(secs => p_window_ms / 1000.0)
        then now()
      else window_started_at
    end,
    requests_in_window = case
      when window_started_at is null or now() - window_started_at >= make_interval(secs => p_window_ms / 1000.0)
        then 1
      else requests_in_window + 1
    end
  where id = p_token_id
    and (
      window_started_at is null
      or now() - window_started_at >= make_interval(secs => p_window_ms / 1000.0)
      or requests_in_window < p_limit
    )
  returning true into did_update;

  return coalesce(did_update, false);
end;
$$;

revoke all on function public.bump_mcp_rate_limit(text, integer, bigint) from public;
grant execute on function public.bump_mcp_rate_limit(text, integer, bigint) to service_role;
