import { randomUUID } from "node:crypto";
import { auth } from "@/auth";
import { sql } from "@/lib/db";
import {
  CheckoutError,
  type CheckoutLine,
  type CheckoutOrder,
  createCheckoutOrder,
  createSteamTopUpOrder,
  createTelegramStarsOrder,
} from "@/lib/payments/checkout";
import { createBill, PayPalychApiError } from "@/lib/payments/paypalych";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public base URL for the payer redirects. success_url / fail_url must share the
// domain configured for the shop in the PayPalych dashboard.
function baseUrl(request: Request): string {
  const configured = process.env.AUTH_URL;
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

// Build the order for the requested checkout kind. `cart` = gift-card
// denominations from the basket; `steam` / `telegram` = a single wallet top-up.
async function buildOrder(
  kind: string,
  b: Record<string, unknown>,
  email: string,
  idempotencyKey: string,
): Promise<CheckoutOrder> {
  if (kind === "steam") {
    return createSteamTopUpOrder({
      email,
      login: String(b.login ?? ""),
      amount: Number(b.amount ?? 0),
      currency: String(b.currency ?? "RUB"),
      idempotencyKey,
    });
  }
  if (kind === "telegram") {
    return createTelegramStarsOrder({
      email,
      username: String(b.username ?? ""),
      stars: Number(b.stars ?? 0),
      idempotencyKey,
    });
  }
  const rawItems = Array.isArray(b.items) ? b.items : [];
  const items: CheckoutLine[] = rawItems.map((it) => {
    const line = it as Record<string, unknown>;
    return {
      denominationId: String(line.denominationId ?? ""),
      quantity: Number(line.quantity ?? 0),
    };
  });
  return createCheckoutOrder({ email, items, idempotencyKey });
}

export async function POST(request: Request) {
  // Checkout requires a signed-in profile (order history + delivery target).
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const kind = String(b.kind ?? "cart");

  // Client-supplied so a double-submit reuses the same order.
  const idempotencyKey =
    typeof b.idempotencyKey === "string" && b.idempotencyKey
      ? b.idempotencyKey
      : randomUUID();

  let order: CheckoutOrder;
  try {
    order = await buildOrder(kind, b, email, idempotencyKey);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return Response.json({ error: error.message, code: error.code }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Checkout failed";
    return Response.json({ error: message }, { status: 500 });
  }

  const base = baseUrl(request);
  let bill;
  try {
    bill = await createBill({
      amount: order.totalMinor / 100,
      orderId: order.publicId,
      currencyIn: "RUB",
      // Top-level order name for the payment form + antifraud (single-item →
      // its name, multi-item cart → the order id).
      name:
        order.items.length === 1
          ? order.items[0].name
          : `Заказ ${order.publicId}`,
      description: `Заказ ${order.publicId}`,
      custom: order.id,
      locale: "ru",
      payerEmail: email,
      // Merchant absorbs the acquiring commission — the customer pays exactly
      // the sticker price shown on the site.
      payerPaysCommission: 0,
      // Line items for PayPalych's antifraud system. Each item already carries
      // the right account identifier in `extra` (buyer email for gift cards,
      // Steam login / Telegram handle for top-ups).
      items: order.items.map((line) => ({
        name: line.name,
        category: line.category,
        quantity: line.quantity,
        price: line.unitPriceMinor / 100,
        extra: line.extra,
      })),
      successUrl: `${base}/api/payments/paypalych/return?order=${order.publicId}&result=success`,
      failUrl: `${base}/api/payments/paypalych/return?order=${order.publicId}&result=fail`,
      returnUrl: `${base}/cart`,
    });
  } catch (error) {
    const status = error instanceof PayPalychApiError ? 502 : 500;
    const message = error instanceof Error ? error.message : "Payment init failed";
    return Response.json({ error: message, order: order.publicId }, { status });
  }

  // Pending payment row keyed by the bill id — the callback flips it to
  // succeeded once PayPalych confirms.
  await sql`
    INSERT INTO payments (
      order_id, provider, provider_payment_id, status,
      amount_minor, currency, raw_payload
    )
    VALUES (
      ${order.id}, 'paypalych', ${bill.billId}, 'pending',
      ${order.totalMinor}, ${order.currency}, ${sql.json({ bill })}
    )
    ON CONFLICT (provider, provider_payment_id) DO NOTHING
  `;

  // Unified order log for reconciliation. Log a category summary only — never
  // the per-item `extra` (Steam logins, Telegram handles, buyer email are PII
  // and must not land in plaintext logs). Full detail lives in the order rows.
  const itemSummary = order.items
    .map((line) => `${line.category}x${line.quantity}`)
    .join(",");
  console.log(
    `[paypalych/create] order=${order.publicId} bill=${bill.billId} ` +
      `amount=${(order.totalMinor / 100).toFixed(2)} items=${itemSummary}`,
  );

  return Response.json({
    order: order.publicId,
    billId: bill.billId,
    payUrl: bill.linkPageUrl,
  });
}
