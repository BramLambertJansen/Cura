// mcp-server — the MCP endpoint for Cura's AI-invoer (Phase 4, CLAUDE.md §5
// "AI-voorstellen"). An externally-connected Claude ("bring your own
// Claude", via Claude Desktop/Code's own MCP config) talks to Cura's
// backend through this single HTTP endpoint to read household context and
// propose tasks — entirely outside the normal ingelogde-gebruiker/RLS flow,
// the same third trust boundary send-reminders already uses (service-role +
// handmatige household-scoping, see the plan's §2).
//
// ── PROTOCOLKEUZE (gedocumenteerd zoals de final-spec vraagt) ──────────────
// The current MCP spec (2025-03-26+) calls this transport "Streamable
// HTTP": JSON-RPC 2.0 messages over a single POST endpoint, whose response
// may be plain `application/json` (for a server that never needs to push a
// second message) or an SSE stream. Before hand-writing a JSON-RPC handler,
// this task asked to check whether `npm:@modelcontextprotocol/sdk` is
// usable inside the Supabase Edge Runtime (Deno + npm-compat).
//
// That could NOT be verified in the environment this was built in: there is
// no Deno runtime, no `supabase functions serve`, and no network access to
// resolve/run an `npm:`-specifier against the actual Edge Runtime. Shipping
// an unverified SDK dependency for a security-sensitive endpoint felt like
// the wrong tradeoff, so this file instead implements a small, dependency-
// free JSON-RPC 2.0 handler for exactly the handful of MCP methods this
// feature needs: `initialize`, `notifications/initialized`, `tools/list`,
// `tools/call` (+ `ping`). No streaming — every response is a single
// `application/json` body, which the Streamable HTTP spec explicitly allows
// for a server that has nothing else to push back.
//
// This is a deliberately cautious choice made without the ability to test
// the alternative, not a considered rejection of the SDK — see the PR
// report for this feature. Whoever deploys this with a real Supabase
// CLI/Deno environment can still switch to the official SDK later; the
// tool surface (below) doesn't need to change either way.
//
// ── AUTH ────────────────────────────────────────────────────────────────
// verify_jwt = false (supabase/config.toml, the same entry send-reminders
// uses): the caller is an external Claude, not a signed-in Supabase user,
// so a Supabase JWT doesn't apply. Instead, this file authenticates itself
// via an `Authorization: Bearer <token>` header (the MCP token minted by
// create_mcp_token / HouseholdSheet), then uses the SERVICE-ROLE key for
// all Postgres access — RLS is fully bypassed for this function. Every
// query below therefore filters EXPLICITLY on the just-validated
// household_id; there is no RLS safety net here, unlike a normal signed-in
// request.
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildLatestCompletionMap, isDone } from "../_shared/reminders.ts";
import type { Task, TaskCompletion } from "../_shared/types.ts";

/** Aanpasbare constante (CLAUDE.md §5 → AI-voorstellen, beslissing 4) — nooit op drie plekken hardcoded. */
const SUGGESTIONS_PER_TOKEN_PER_DAY = 30;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function jsonRpcResult(id: unknown, result: unknown): Response {
  return json({ jsonrpc: "2.0", id, result });
}

function jsonRpcError(id: unknown, code: number, message: string, status = 200): Response {
  return json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, status);
}

/** sha-256 hex digest, matching Postgres' `encode(digest(x, 'sha256'), 'hex')` (create_mcp_token's own hash) byte-for-byte. */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digestBuf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digestBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface TokenContext {
  tokenId: string;
  householdId: string;
  createdByMemberId: string;
}

/**
 * Validates the Authorization bearer token against mcp_access_tokens.
 *   1. Hash the received token.
 *   2. Look it up (revoked_at is null).
 *   3. Not found/revoked -> null (caller returns 401).
 *   4. household_id/created_by_member_id are resolved from THIS row,
 *      server-side — never trusted from the request body.
 *   5. last_used_at is updated best-effort (never blocks the request).
 */
async function validateToken(supabase: ReturnType<typeof createClient>, authHeader: string | null): Promise<TokenContext | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const raw = authHeader.slice("Bearer ".length).trim();
  if (!raw) return null;
  const hash = await sha256Hex(raw);
  const { data, error } = await supabase
    .from("mcp_access_tokens")
    .select("id, household_id, created_by_member_id, revoked_at")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { id: string; household_id: string; created_by_member_id: string };
  void supabase.from("mcp_access_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id);
  return { tokenId: row.id, householdId: row.household_id, createdByMemberId: row.created_by_member_id };
}

/**
 * Rolling 24h window, reset once older than that (CLAUDE.md §5 →
 * AI-voorstellen decision 4). Fails CLOSED: if the current window/count
 * can't be read or the bumped value can't be written, the caller treats
 * this as "not allowed" rather than silently letting an unbounded write
 * through — this is the one place an unauthenticated-to-Supabase caller
 * can write at all, so the safer failure direction is "refuse", not "allow".
 */
async function checkAndBumpRateLimit(supabase: ReturnType<typeof createClient>, tokenId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("mcp_access_tokens")
    .select("window_started_at, requests_in_window")
    .eq("id", tokenId)
    .single();
  if (error || !data) return false;
  const row = data as { window_started_at: string | null; requests_in_window: number };

  const now = Date.now();
  const windowStartedMs = row.window_started_at ? new Date(row.window_started_at).getTime() : null;
  const windowExpired = windowStartedMs === null || now - windowStartedMs >= RATE_LIMIT_WINDOW_MS;

  if (!windowExpired && row.requests_in_window >= SUGGESTIONS_PER_TOKEN_PER_DAY) {
    return false;
  }

  const nextWindowStartedAt = windowExpired ? new Date(now).toISOString() : row.window_started_at;
  const nextCount = windowExpired ? 1 : row.requests_in_window + 1;

  const { error: updateError } = await supabase
    .from("mcp_access_tokens")
    .update({ window_started_at: nextWindowStartedAt, requests_in_window: nextCount })
    .eq("id", tokenId);
  return !updateError;
}

// ─── Tools ───────────────────────────────────────────────────────────────
// Read tools give the connected Claude enough household context to make a
// sensible suggestion instead of blindly retyping an email subject line.
// suggest_task is the ONLY write tool — the tool surface can add, never
// mutate/withdraw, keeping the trust boundary small and easy to audit
// (CLAUDE.md §5 → AI-voorstellen §3). list_routines is deliberately absent
// (decision 2: a suggestion is always one-off).
const TOOLS = [
  {
    name: "list_rooms",
    description: "Lijst kamers in dit huishouden, zodat je een roomId kunt kiezen voor suggest_task.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_open_tasks",
    description: "Lijst open (niet-afgeronde) taken in dit huishouden, zodat je niets voorstelt dat al getrackt wordt.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_pending_suggestions",
    description: "Lijst voorstellen in dit huishouden die nog niet beoordeeld zijn, om te voorkomen dat je dezelfde e-mail/gebeurtenis twee keer voorstelt.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "suggest_task",
    description:
      "Doe een nieuw, eenmalig taakvoorstel voor dit huishouden. Wordt pas een echte taak nadat een huishoudlid het in Cura accepteert. sourceNote is verplicht en wordt altijd getoond — nooit leeg of verzonnen.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        roomId: { type: "string", description: "Moet een id uit list_rooms zijn — een kamer die niet bij dit huishouden hoort wordt geweigerd." },
        durationMin: { type: "integer", minimum: 1 },
        dueDateSuggestion: { type: "string", description: "ISO 8601-tijdstip." },
        dagdeelSuggestion: { type: "string", enum: ["ochtend", "middag", "avond"] },
        sourceNote: { type: "string", description: "Korte, eerlijke reden — bv. 'uit e-mail over de tandarts'." },
      },
      required: ["title", "sourceNote"],
      additionalProperties: false,
    },
  },
] as const;

async function listRooms(supabase: ReturnType<typeof createClient>, householdId: string) {
  const { data, error } = await supabase.from("rooms").select("id, name").eq("household_id", householdId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Reuses the SAME pure isDone/buildLatestCompletionMap engine send-reminders already uses — no new copy of "is this recurring task open" logic. */
async function listOpenTasks(supabase: ReturnType<typeof createClient>, householdId: string) {
  const { data: householdRow, error: householdError } = await supabase
    .from("households")
    .select("time_zone")
    .eq("id", householdId)
    .single();
  if (householdError) throw new Error(householdError.message);
  const timeZone = ((householdRow as { time_zone?: string } | null)?.time_zone) ?? "Europe/Amsterdam";

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, room_id, due_date, interval_days, planned")
    .eq("household_id", householdId);
  if (taskError) throw new Error(taskError.message);
  const rows = (taskRows ?? []) as any[];

  const { data: compRows, error: compError } = await supabase
    .from("task_completions")
    .select("task_id, completed_at, tasks!inner(household_id)")
    .eq("tasks.household_id", householdId);
  if (compError) throw new Error(compError.message);
  const completions: TaskCompletion[] = ((compRows ?? []) as any[]).map((r) => ({ taskId: r.task_id, completedAt: r.completed_at }));
  const latestByTask = buildLatestCompletionMap(completions);

  const now = Date.now();
  return rows
    .filter((r) => {
      const t: Task = { id: r.id, title: r.title, intervalDays: r.interval_days ?? undefined, dueDate: r.due_date ?? undefined };
      return !isDone(t, latestByTask.get(t.id), now, timeZone);
    })
    .map((r) => ({
      id: r.id,
      title: r.title,
      roomId: r.room_id ?? undefined,
      dueDate: r.due_date ?? undefined,
      intervalDays: r.interval_days ?? undefined,
      planned: r.planned,
    }));
}

async function listPendingSuggestions(supabase: ReturnType<typeof createClient>, householdId: string) {
  const { data, error } = await supabase
    .from("task_suggestions")
    .select("id, title, source_note, created_at")
    .eq("household_id", householdId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((r) => ({ id: r.id, title: r.title, sourceNote: r.source_note, createdAt: r.created_at }));
}

async function suggestTask(supabase: ReturnType<typeof createClient>, ctx: TokenContext, args: Record<string, unknown>) {
  const title = typeof args.title === "string" ? args.title.trim() : "";
  const sourceNote = typeof args.sourceNote === "string" ? args.sourceNote.trim() : "";
  if (!title) throw new Error("title is verplicht.");
  // Always shown, never empty (§2 honesty over precision) — enforced here too,
  // not just in the client-side schema, since this function bypasses RLS/the
  // normal Zod-at-the-boundary write path entirely.
  if (!sourceNote) throw new Error("sourceNote is verplicht — een AI-voorstel toont altijd waarom het er is.");

  const roomId = typeof args.roomId === "string" && args.roomId ? args.roomId : undefined;
  if (roomId) {
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .eq("household_id", ctx.householdId)
      .maybeSingle();
    if (roomError) throw new Error(roomError.message);
    if (!room) throw new Error("roomId hoort niet bij dit huishouden.");
  }

  const durationMin = typeof args.durationMin === "number" && Number.isInteger(args.durationMin) && args.durationMin > 0
    ? args.durationMin
    : undefined;
  const dueDateSuggestion = typeof args.dueDateSuggestion === "string" ? args.dueDateSuggestion : undefined;
  const dagdeelSuggestion = args.dagdeelSuggestion === "ochtend" || args.dagdeelSuggestion === "middag" || args.dagdeelSuggestion === "avond"
    ? args.dagdeelSuggestion
    : undefined;

  const allowed = await checkAndBumpRateLimit(supabase, ctx.tokenId);
  if (!allowed) {
    throw new Error(`Limiet bereikt: maximaal ${SUGGESTIONS_PER_TOKEN_PER_DAY} voorstellen per token per rollend etmaal.`);
  }

  const id = crypto.randomUUID();
  const { error } = await supabase.from("task_suggestions").insert({
    id,
    household_id: ctx.householdId,
    title,
    room_id: roomId ?? null,
    duration_min: durationMin ?? null,
    due_date_suggestion: dueDateSuggestion ?? null,
    dagdeel_suggestion: dagdeelSuggestion ?? null,
    source_note: sourceNote,
    created_by_member_id: ctx.createdByMemberId,
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  return { id, status: "pending" };
}

async function callTool(supabase: ReturnType<typeof createClient>, ctx: TokenContext, name: unknown, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "list_rooms":
      return listRooms(supabase, ctx.householdId);
    case "list_open_tasks":
      return listOpenTasks(supabase, ctx.householdId);
    case "list_pending_suggestions":
      return listPendingSuggestions(supabase, ctx.householdId);
    case "suggest_task":
      return suggestTask(supabase, ctx, args);
    default:
      throw new Error(`Onbekende tool: ${String(name)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[mcp-server] misconfigured: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set");
    return json({ error: "misconfigured" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: { jsonrpc?: string; id?: unknown; method?: string; params?: any };
  try {
    body = await req.json();
  } catch {
    return jsonRpcError(null, -32700, "Parse error");
  }

  const { id, method, params } = body;
  const isNotification = id === undefined;

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: "2025-03-26",
      capabilities: { tools: {} },
      serverInfo: { name: "cura-mcp-server", version: "1.0.0" },
    });
  }

  // Notifications carry no `id` and get no JSON-RPC response body per the
  // spec — most relevant here is `notifications/initialized`, sent right
  // after `initialize`.
  if (method === "notifications/initialized" || isNotification) {
    return new Response(null, { status: 202 });
  }

  if (method === "ping") return jsonRpcResult(id, {});

  const ctx = await validateToken(supabase, req.headers.get("authorization"));
  if (!ctx) return jsonRpcError(id, -32001, "Unauthorized", 401);

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = (params?.arguments ?? {}) as Record<string, unknown>;
    try {
      const output = await callTool(supabase, ctx, name, args);
      return jsonRpcResult(id, { content: [{ type: "text", text: JSON.stringify(output) }] });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Onbekende fout";
      // MCP tool-level errors are reported INSIDE a successful JSON-RPC
      // result (isError: true), not as a JSON-RPC transport error — that's
      // how the calling model actually gets to see and react to the failure
      // text, instead of a bare "something went wrong" at the protocol layer.
      return jsonRpcResult(id, { content: [{ type: "text", text: message }], isError: true });
    }
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
});
