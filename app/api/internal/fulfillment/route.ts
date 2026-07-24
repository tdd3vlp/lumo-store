import { timingSafeEqual } from "node:crypto";
import { recordOrderPaid } from "@/lib/audit/order-paid";
import { sql } from "@/lib/db";
import { giftCardMailer } from "@/lib/email/smtp-provider";
import { processOneEmailOutbox } from "@/lib/email/process-outbox";
import {
  FULFILLMENT_LEASE_MINUTES,
  fulfillOrder,
} from "@/lib/payments/fulfillment";
import { sendTelegramAlert } from "@/lib/notifications/telegram";

// An order that has sat this long in a should-have-left state (paid-but-unfulfilled,
// stale 'fulfilling' lease, or manual_review) is treated as a silent stall and
// alerted. Fast-path + worker normally fulfil within a minute or two, so this is
// comfortably clear of transient NS.gifts hiccups.
const STUCK_ALERT_MINUTES = 15;

// Unpaid orders older than this are parked as 'cancelled' (reversible by a late
// SUCCESS postback) so abandoned checkout attempts don't accumulate forever.
const PENDING_EXPIRY_HOURS = 24;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Internal worker tick, driven by a systemd timer (curl with the shared secret).
// Runs in the Next.js runtime so it can reuse the app's fulfilment + email code.
// 1) reconcile: fulfil any paid order the callback's post-response didn't finish
//    (crash, NS.gifts flake) — fulfillOrder is idempotent.
// 2) drain: send queued delivery emails.

// Constant-time compare so the bearer secret can't be recovered byte-by-byte
// via response timing. (signaturesMatch is not reused: it upper-cases both
// sides for hex signatures, which would collapse the case of a real secret.)
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function authorized(request: Request): boolean {
  const secret = process.env.INTERNAL_WORKER_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!process.env.INTERNAL_WORKER_SECRET) {
    return Response.json({ error: "worker disabled" }, { status: 503 });
  }
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // 1) Reconcile stuck orders (bounded per tick):
  //    - freshly paid ones the callback fast-path didn't finish;
  //    - fulfilment failures parked in manual_review (identifiable because the
  //      callback set paid_at before fulfilment ran; amount-mismatch parks
  //      never get paid_at, so they stay for a human). 2h window bounds retries;
  //    - abandoned 'fulfilling' leases: a process that died mid-fulfilment
  //      (deploy restart, crash) left the order in 'fulfilling' with a stale
  //      fulfillment_started_at. fulfillOrder only re-claims a stale lease, so
  //      this can't fight an in-progress attempt.
  const paid = await sql`
    SELECT id FROM orders
    WHERE status = 'paid'
       OR (status = 'manual_review'
           AND paid_at IS NOT NULL
           AND paid_at > now() - interval '2 hours')
       OR (status = 'fulfilling'
           AND fulfillment_started_at IS NOT NULL
           AND fulfillment_started_at
             < now() - (${FULFILLMENT_LEASE_MINUTES} * interval '1 minute'))
    ORDER BY paid_at NULLS FIRST
    LIMIT 25
  `;
  let fulfilled = 0;
  for (const order of paid) {
    await fulfillOrder(String(order.id));
    fulfilled += 1;
  }

  // 1b) Backfill ORDER_PAID for recently-paid orders whose best-effort audit
  //     write was lost to a crash between the payment commit and the callback's
  //     post-response hook. Bounded to the same recent window; the deterministic
  //     event_key makes repeats a no-op (ON CONFLICT DO NOTHING).
  const missingPaid = await sql`
    SELECT o.id, o.customer_id, o.paid_at
    FROM orders o
    WHERE o.paid_at IS NOT NULL
      AND o.paid_at > now() - interval '2 hours'
      AND o.status IN ('paid', 'fulfilling', 'fulfilled')
      AND NOT EXISTS (
        SELECT 1 FROM digital_access_log l
        WHERE l.order_id = o.id AND l.event_type = 'ORDER_PAID'
      )
    ORDER BY o.paid_at
    LIMIT 25
  `;
  let backfilled = 0;
  for (const o of missingPaid) {
    await recordOrderPaid({
      orderId: String(o.id),
      customerId: o.customer_id === null ? null : String(o.customer_id),
      paidAt: new Date(o.paid_at as string),
      backfill: true,
    });
    backfilled += 1;
  }

  // 2) Drain the delivery-email queue (bounded).
  const mailer = giftCardMailer();
  let sent = 0;
  for (let i = 0; i < 25; i += 1) {
    try {
      const did = await processOneEmailOutbox(mailer);
      if (!did) break;
      sent += 1;
    } catch {
      // Row already moved to retry with backoff; stop this tick.
      break;
    }
  }

  // 3) Alert (once each) on orders stuck past the threshold, so a silent
  //    fulfilment stall pages a human instead of waiting on a customer
  //    complaint. Anchored on stable timestamps (never updated_at, which the
  //    retry loop bumps): paid_at for paid/manual_review, fulfillment_started_at
  //    for a leaked 'fulfilling' lease. stuck_alerted_at guarantees one alert
  //    per order regardless of how many ticks the condition holds.
  const stuck = await sql`
    SELECT public_id, status
    FROM orders
    WHERE stuck_alerted_at IS NULL
      AND (
        (status = 'paid'
          AND COALESCE(paid_at, created_at)
            < now() - (${STUCK_ALERT_MINUTES} * interval '1 minute'))
        OR (status = 'fulfilling'
          AND fulfillment_started_at IS NOT NULL
          AND fulfillment_started_at
            < now() - (${STUCK_ALERT_MINUTES} * interval '1 minute'))
        OR (status = 'manual_review'
          AND COALESCE(paid_at, created_at)
            < now() - (${STUCK_ALERT_MINUTES} * interval '1 minute'))
      )
    ORDER BY created_at
    LIMIT 25
  `;
  let alerted = 0;
  if (stuck.length > 0) {
    const lines = stuck
      .map((o) => `• ${o.public_id} — ${o.status}`)
      .join("\n");
    const ok = await sendTelegramAlert(
      `🚨 Заказы застряли без выдачи (${stuck.length}), нужна проверка:\n${lines}`,
    );
    // Only mark as alerted if the message actually went out — otherwise (e.g.
    // Telegram not configured yet) leave them to be reported on a later tick.
    if (ok) {
      await sql`
        UPDATE orders SET stuck_alerted_at = now()
        WHERE public_id IN ${sql(stuck.map((o) => String(o.public_id)))}
      `;
      alerted = stuck.length;
    }
  }

  // 4) Expire abandoned pending orders. Every "Pay" click after a failure mints
  //    a fresh order (new idempotency key), so unpaid attempts accumulate. Park
  //    them as 'cancelled' after the window. Non-destructive and reversible: a
  //    late SUCCESS postback still flips the order to 'paid' (the callback's
  //    terminal guard excludes 'cancelled'), so a genuine slow payer isn't lost.
  const [{ expired }] = await sql`
    WITH stale AS (
      UPDATE orders
      SET status = 'cancelled', updated_at = now()
      WHERE status = 'pending'
        AND created_at < now() - (${PENDING_EXPIRY_HOURS} * interval '1 hour')
      RETURNING 1
    )
    SELECT COUNT(*)::int AS expired FROM stale
  `;

  return Response.json({
    reconciled: fulfilled,
    orderPaidBackfilled: backfilled,
    emailsSent: sent,
    alerted,
    expired: Number(expired),
  });
}

export function GET(request: Request) {
  return POST(request);
}
