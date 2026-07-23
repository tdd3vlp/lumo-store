import { after } from "next/server";
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

  let paidOrderId: string | null = null;
  try {
    paidOrderId = await sql.begin(async (tx) => {
      const [order] = await tx`
        SELECT id, status, total_minor, currency
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
        await tx`
          UPDATE orders
          SET status = 'paid', paid_at = now(), updated_at = now()
          WHERE id = ${order.id}
        `;
        return String(order.id);
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

  // Kick off fulfilment after the 200 is sent (warehouse-first → NS.gifts). The
  // reconcile worker retries anything that fails here.
  if (paidOrderId) {
    const id = paidOrderId;
    after(() =>
      fulfillOrder(id).catch((e) =>
        console.error(`[paypalych/callback] fulfil ${id}: ${e?.message ?? e}`),
      ),
    );
  }

  return new Response("OK", { status: 200 });
}
