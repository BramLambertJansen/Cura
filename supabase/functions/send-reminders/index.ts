// send-reminders — the server-side push scheduler.
//
// Invoked every minute by pg_cron via pg_net (see the reminder-cron migration).
// For each household it computes which wekkers are due right now — using the
// SAME pure engine as the in-app poller (../_shared/reminders.ts, a byte-
// identical copy of src/data/reminders.ts) with the household's timezone —
// atomically claims each reminder against reminder_dispatches so overlapping
// ticks never double-send, and pushes to that household's subscriptions —
// skipping any subscription whose member is currently in their quiet hours.
//
// verify_jwt=false (config.toml): it's cron-invoked, not user-invoked, so it's
// guarded by a shared CRON_SECRET header instead of a user JWT.
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildLatestCompletionMap, getDueReminders, isWithinQuietHours } from "../_shared/reminders.ts";
import type { Task, TaskCompletion } from "../_shared/types.ts";
import { sendWebPush } from "../_shared/webpush.ts";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Push endpoint host (e.g. "fcm.googleapis.com") for logging — never the full URL. */
function hostOf(endpoint: string): string {
  try {
    return new URL(endpoint).host;
  } catch {
    return "invalid-endpoint";
  }
}

/**
 * Constant-time-ish string compare for the CRON_SECRET check below (#170) —
 * hashing both sides first means the comparison always runs over two
 * same-length digests with no early exit on a content/length mismatch,
 * closing the theoretical timing side-channel of a plain `!==` compare.
 */
async function secretsMatch(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [da, db] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const bytesA = new Uint8Array(da);
  const bytesB = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  // This endpoint sends push, so it must not be publicly callable.
  const secret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!secret || !provided || !(await secretsMatch(provided, secret))) {
    return json({ error: "unauthorized" }, 401);
  }

  // Validate presence before createClient() — same guard the CRON_SECRET check
  // above already gets. Without it a missing/rotated secret crashes every
  // cron invocation with an unhandled exception instead of a diagnosable
  // 500 (#194).
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[send-reminders] misconfigured: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not set");
    return json({ error: "misconfigured" }, 500);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = Date.now();
  let claimed = 0;
  let sent = 0;
  let pruned = 0;

  const { data: households, error: hErr } = await supabase
    .from("households")
    .select("id, time_zone");
  if (hErr) return json({ error: hErr.message }, 500);

  for (const h of households ?? []) {
    const householdId = h.id as string;
    const timeZone = (h.time_zone as string) ?? "Europe/Amsterdam";

    // Only tasks carrying a wekker are reminder candidates.
    const { data: taskRows, error: taskErr } = await supabase
      .from("tasks")
      .select("id, title, interval_days, due_date")
      .eq("household_id", householdId)
      .not("due_date", "is", null);
    if (taskErr) {
      // A query failure must not read as "this household has nothing due" —
      // that made a persistent per-household DB error indistinguishable from
      // a quiet minute, with zero log output either way (#194).
      console.error(`[send-reminders] tasks query failed for household ${householdId}: ${taskErr.message}`);
      continue;
    }
    const tasks: Task[] = (taskRows ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      intervalDays: r.interval_days ?? undefined,
      dueDate: r.due_date ?? undefined,
    }));
    if (tasks.length === 0) continue;

    const { data: compRows, error: compErr } = await supabase
      .from("task_completions")
      .select("task_id, completed_at, tasks!inner(household_id)")
      .eq("tasks.household_id", householdId);
    if (compErr) {
      console.error(`[send-reminders] completions query failed for household ${householdId}: ${compErr.message}`);
      continue;
    }
    const completions: TaskCompletion[] = (compRows ?? []).map((r: any) => ({
      taskId: r.task_id,
      completedAt: r.completed_at,
    }));

    const due = getDueReminders(tasks, buildLatestCompletionMap(completions), now, timeZone);
    if (due.length === 0) continue;

    // No one to notify → don't consume the dedup key (so a later subscribe today
    // can still receive it).
    const { data: subs, error: subsErr } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, members(quiet_hours_start, quiet_hours_end)")
      .eq("household_id", householdId);
    if (subsErr) {
      console.error(`[send-reminders] subscriptions query failed for household ${householdId}: ${subsErr.message}`);
      continue;
    }
    if (!subs || subs.length === 0) continue;

    for (const r of due) {
      // Quiet hours hold the PING back per subscription, not the reminder
      // itself: a member asleep right now just doesn't get woken for this
      // one. If EVERYONE's subscriptions are currently quiet, skip claiming
      // the dedup key entirely so the next minute's tick retries — the
      // moment the last quiet window ends, the push goes out then instead of
      // being silently lost for the day.
      const awake = (subs as any[]).filter((s) => {
        const m = s.members;
        return !isWithinQuietHours(now, timeZone, m?.quiet_hours_start ?? undefined, m?.quiet_hours_end ?? undefined);
      });
      if (awake.length === 0) continue;

      // Atomic claim: insert-or-nothing, send only if WE inserted the row.
      // Claiming before sending (rather than after) is deliberate: it's what
      // stops two overlapping cron ticks from both sending the same wekker
      // twice. The cost is that a claim now has to be compensated below if
      // the send actually fails (#189) — otherwise a real send failure (a
      // rotated/misconfigured VAPID secret, a transient network error) would
      // burn the dedup key and the next tick would never retry, silently
      // losing this wekker (permanently, for a one-off task).
      const { data: ins, error: insErr } = await supabase
        .from("reminder_dispatches")
        .upsert({ fired_for_key: r.firedForKey }, { onConflict: "fired_for_key", ignoreDuplicates: true })
        .select("fired_for_key");
      if (insErr) {
        console.error(`[send-reminders] dedup claim failed for key ${r.firedForKey}: ${insErr.message}`);
        continue;
      }
      if (!ins || ins.length === 0) continue;
      claimed++;

      const payload = {
        title: r.title,
        body: "Je hebt dit op de planning staan.",
        firedForKey: r.firedForKey,
        // Deep-link: tik op de wekker opent de taak zelf (EditTaskSheet via
        // useTaskDeepLink). Expliciet /vandaag i.p.v. "/" want de "/"→/vandaag
        // Navigate laat de ?taak-query vallen. taskId gaat ook mee zodat een al
        // open tab in-SPA kan routeren i.p.v. te herladen.
        taskId: r.taskId,
        url: `/vandaag?taak=${r.taskId}`,
      };
      let anySent = false;
      let anyHardFailure = false;
      for (const s of awake) {
        const res = await sendWebPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload);
        if (res.ok) {
          sent++;
          anySent = true;
        } else if (res.gone) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          pruned++;
        } else {
          // A real send failure (bad/misquoted VAPID keys, payload encryption error,
          // or an FCM 4xx/5xx that isn't 404/410). Log it — otherwise it vanishes and
          // a broken push setup just looks like "sent: 0" with no clue why.
          anyHardFailure = true;
          console.error(
            `[send-reminders] push failed for ${hostOf(s.endpoint)} ` +
              `(task ${r.taskId}, key ${r.firedForKey}): status=${res.status ?? "n/a"} ` +
              `error=${res.error ?? "unknown"}`,
          );
        }
      }
      // Nothing was actually delivered (every awake subscription hard-failed)
      // — release the claim so next minute's tick retries instead of treating
      // this as delivered. A partial success (some hard-failed, one landed)
      // keeps the claim: the wekker DID reach someone, and "dubbel is minder
      // erg dan gemist" doesn't apply to a housemate who already got it.
      if (!anySent && anyHardFailure) {
        const { error: delErr } = await supabase.from("reminder_dispatches").delete().eq("fired_for_key", r.firedForKey);
        // If the compensating delete itself fails, the claim silently sticks and
        // the original #189 bug recurs one layer deeper — this wekker is now
        // lost for good instead of retried next tick. Log loudly so it's at
        // least visible in the function logs rather than indistinguishable from
        // "delivered".
        if (delErr) {
          console.error(
            `[send-reminders] failed to release dedup claim for key ${r.firedForKey} after a failed send — ` +
              `this reminder will NOT retry: ${delErr.message}`,
          );
        }
      }
    }
  }

  // One concise line per active tick (quiet minutes stay silent) so the outcome is
  // visible in the function logs, not only in the HTTP response body / net._http_response.
  if (claimed > 0 || pruned > 0) {
    console.log(`[send-reminders] claimed=${claimed} sent=${sent} pruned=${pruned}`);
  }
  return json({ ok: true, claimed, sent, pruned });
});
