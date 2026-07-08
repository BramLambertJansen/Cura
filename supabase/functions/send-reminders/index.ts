// send-reminders — the server-side push scheduler.
//
// Invoked every minute by pg_cron via pg_net (see the reminder-cron migration).
// For each household it computes which wekkers are due right now — using the
// SAME pure engine as the in-app poller (../_shared/reminders.ts, a byte-
// identical copy of src/data/reminders.ts) with the household's timezone —
// atomically claims each reminder against reminder_dispatches so overlapping
// ticks never double-send, and pushes to that household's subscriptions.
//
// verify_jwt=false (config.toml): it's cron-invoked, not user-invoked, so it's
// guarded by a shared CRON_SECRET header instead of a user JWT.
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildLatestCompletionMap, getDueReminders } from "../_shared/reminders.ts";
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

Deno.serve(async (req) => {
  // This endpoint sends push, so it must not be publicly callable.
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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
    const { data: taskRows } = await supabase
      .from("tasks")
      .select("id, title, interval_days, due_date")
      .eq("household_id", householdId)
      .not("due_date", "is", null);
    const tasks: Task[] = (taskRows ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      intervalDays: r.interval_days ?? undefined,
      dueDate: r.due_date ?? undefined,
    }));
    if (tasks.length === 0) continue;

    const { data: compRows } = await supabase
      .from("task_completions")
      .select("task_id, completed_at, tasks!inner(household_id)")
      .eq("tasks.household_id", householdId);
    const completions: TaskCompletion[] = (compRows ?? []).map((r: any) => ({
      taskId: r.task_id,
      completedAt: r.completed_at,
    }));

    const due = getDueReminders(tasks, buildLatestCompletionMap(completions), now, timeZone);
    if (due.length === 0) continue;

    // No one to notify → don't consume the dedup key (so a later subscribe today
    // can still receive it).
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("household_id", householdId);
    if (!subs || subs.length === 0) continue;

    for (const r of due) {
      // Atomic claim: insert-or-nothing, send only if WE inserted the row.
      const { data: ins, error: insErr } = await supabase
        .from("reminder_dispatches")
        .upsert({ fired_for_key: r.firedForKey }, { onConflict: "fired_for_key", ignoreDuplicates: true })
        .select("fired_for_key");
      if (insErr || !ins || ins.length === 0) continue;
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
      for (const s of subs as any[]) {
        const res = await sendWebPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload);
        if (res.ok) {
          sent++;
        } else if (res.gone) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          pruned++;
        } else {
          // A real send failure (bad/misquoted VAPID keys, payload encryption error,
          // or an FCM 4xx/5xx that isn't 404/410). Log it — otherwise it vanishes and
          // a broken push setup just looks like "sent: 0" with no clue why.
          console.error(
            `[send-reminders] push failed for ${hostOf(s.endpoint)} ` +
              `(task ${r.taskId}, key ${r.firedForKey}): status=${res.status ?? "n/a"} ` +
              `error=${res.error ?? "unknown"}`,
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
