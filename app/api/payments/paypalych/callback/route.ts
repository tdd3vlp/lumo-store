import { after } from "next/server";
import { recordOrderPaid } from "@/lib/audit/order-paid";
import { sql } from "@/lib/db";
import { fulfillOrder } from "@/lib/payments/fulfillment";
import {
  type PayPalychStatus,
  verifySignature,
} from "@/lib/payments/paypalych";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PayPalych Payment postback (the shop's Result URL). Server-to-server, format
// application/x-www-form-urlencoded, authenticated by SignatureValue. This is
// the source of truth for a paid order — the browser success redirect is not
// trusted. Reply 200 on anything we have durably handled, otherwise PayPalych
// retries (5 times, exponential backoff). A bad signature gets 403 so a spoofed
// call is rejected (and retried, harmlessly).

export async function POST(request: Request) {
  let form: URLSearchParams;
  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const invId = form.get("InvId") ?? "";
  const outSum = form.get("OutSum") ?? "";
  const signature = form.get("SignatureValue") ?? "";
  const status = (form.get("Status") ?? "") as PayPalychStatus;
  const trsId = form.get("TrsId") ?? "";

  if (!invId || !outSum || !signature) {
    return new Response("missing fields", { status: 400 });
  }
  if (!verifySignature(outSum, invId, signature)) {
    return new Response("invalid signature", { status: 403 });
  }

  const rawPayload: Record<string, string> = {};
  for (const [k, v] of form) rawPayload[k] = v;

  let paid: {
    id: string;
    customerId: string | null;
    paidAt: string;
  } | null = null;
  try {
    paid = await sql.begin(async (tx) => {
      const [order] = await tx`
        SELECT id, status, total_minor, currency, customer_id
        FROM orders
        WHERE public_id = ${invId}
        FOR UPDATE
      `;
      if (!order) {
        // Unknown order: nothing to do, but ack so it stops retrying.
        return null;
      }

      // Amount sanity: OutSum is what the payer paid and may EXCEED the bill
      // when payer_pays_commission=1 (commission added on top), so require
      // "at least the price", not equality.
      const paidMinor = Math.round(Number.parseFloat(outSum) * 100);
      const enough =
        Number.isFinite(paidMinor) && paidMinor >= Number(order.total_minor);

      const paymentStatus =
        status === "SUCCESS" ? "succeeded" : status === "FAIL" ? "failed" : "pending";

      await tx`
        INSERT INTO payments (
          order_id, provider, provider_payment_id, status,
          amount_minor, currency, raw_payload
        )
        VALUES (
          ${order.id}, 'paypalych', ${trsId || invId}, ${paymentStatus},
          ${paidMinor}, ${order.currency}, ${sql.json(rawPayload)}
        )
        ON CONFLICT (provider, provider_payment_id) DO UPDATE SET
          status = EXCLUDED.status,
          amount_minor = EXCLUDED.amount_minor,
          raw_payload = EXCLUDED.raw_payload,
          updated_at = now()
      `;

      // Terminal states already reached: don't regress.
      if (order.status === "paid" || order.status === "fulfilled" || order.status === "fulfilling") {
        return null;
      }

      if (status === "SUCCESS" && enough) {
        const [updated] = await tx`
          UPDATE orders
          SET status = 'paid', paid_at = now(), updated_at = now()
          WHERE id = ${order.id}
          RETURNING paid_at
        `;
        // ORDER_PAID is journalled AFTER commit (best-effort), never inside this
        // transaction — audit must not be able to block payment confirmation.
        return {
          id: String(order.id),
          customerId:
            order.customer_id === null ? null : String(order.customer_id),
          paidAt: new Date(updated.paid_at).toISOString(),
        };
      }
      if (status === "SUCCESS" || status === "OVERPAID" || status === "UNDERPAID") {
        // Paid, but amount/status needs a human (under/overpaid or short pay).
        await tx`
          UPDATE orders
          SET status = 'manual_review', updated_at = now()
          WHERE id = ${order.id}
        `;
      }
      // FAIL: leave the order pending so the customer can retry.
      return null;
    });
  } catch (error) {
    // DB failure: 500 so PayPalych retries and we don't lose the notification.
    const message = error instanceof Error ? error.message : "callback error";
    console.error(`[paypalych/callback] ${invId}: ${message}`);
    return new Response("error", { status: 500 });
  }

  // After the 200 is sent: journal ORDER_PAID (best-effort, never blocks) and
  // kick off fulfilment (warehouse-first → NS.gifts). The reconcile worker
  // retries fulfilment and backfills ORDER_PAID for anything lost to a crash
  // between commit and here.
  if (paid) {
    const p = paid;
    after(async () => {
      await recordOrderPaid({
        orderId: p.id,
        customerId: p.customerId,
        paidAt: new Date(p.paidAt),
        trsId: trsId || null,
      });
      await fulfillOrder(p.id).catch((e) =>
        console.error(`[paypalych/callback] fulfil ${p.id}: ${e?.message ?? e}`),
      );
    });
  }

  return new Response("OK", { status: 200 });
}
