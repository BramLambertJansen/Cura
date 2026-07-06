// VAPID-signed Web Push from a Supabase Edge Function (Deno).
//
// node's `web-push` doesn't run cleanly on Deno; @negrel/webpush is Web
// Crypto-based and does both VAPID (ES256 JWT) and RFC 8291 aes128gcm payload
// encryption. This wrapper is the ONLY place that knows the library, so if its
// API/version shifts, only this file changes.
//
// Setup (run once, then store as Supabase secrets — never VITE_-prefixed):
//   1. Generate a keypair with the library's own tooling so formats match:
//        import * as webpush from "jsr:@negrel/webpush@0.3.0";
//        const keys = await webpush.generateVapidKeys();
//        console.log(JSON.stringify(await webpush.exportVapidKeys(keys)));
//      → `supabase secrets set VAPID_KEYS='<that JSON>'`
//   2. Derive the browser applicationServerKey (urlbase64 of 0x04|x|y from the
//      public JWK) and put it in the client env as VITE_VAPID_PUBLIC_KEY.
//   3. Optionally `supabase secrets set VAPID_CONTACT=mailto:feedback@cura.app`.
//
// IMPORTANT: verify the exact @negrel/webpush version + method names against the
// library at deploy time, and do a real end-to-end send to a physical device
// BEFORE wiring the cron scheduler (this is the highest-risk piece).

// deno-lint-ignore-file no-explicit-any
import * as webpush from "jsr:@negrel/webpush@0.3.0";

let cachedServer: any = null;

async function getServer(): Promise<any> {
  if (cachedServer) return cachedServer;
  // Env var names are case-sensitive on the edge runtime — set the secret as
  // uppercase VAPID_KEYS (see .env.example).
  const raw = Deno.env.get("VAPID_KEYS");
  if (!raw) throw new Error("VAPID_KEYS secret is not set");
  const vapidKeys = await webpush.importVapidKeys(JSON.parse(raw), { extractable: false });
  cachedServer = await webpush.ApplicationServer.new({
    contactInformation: Deno.env.get("VAPID_CONTACT") ?? "mailto:feedback@cura.app",
    vapidKeys,
  });
  return cachedServer;
}

export interface WebPushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface WebPushResult {
  ok: boolean;
  /** True when the push service says the subscription is gone (404/410) → prune the row. */
  gone: boolean;
  status?: number;
  error?: string;
}

export async function sendWebPush(target: WebPushTarget, payload: unknown): Promise<WebPushResult> {
  try {
    const server = await getServer();
    const subscriber = server.subscribe({
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
    });
    await subscriber.pushTextMessage(JSON.stringify(payload), {});
    return { ok: true, gone: false };
  } catch (err) {
    const status = (err as { response?: Response })?.response?.status;
    const gone = status === 404 || status === 410;
    return { ok: false, gone, status, error: err instanceof Error ? err.message : String(err) };
  }
}
