import "server-only";
import { creditFulfilledOrder } from "@/lib/account/loyalty";
import { sql } from "@/lib/db";
import { addInventoryCodes } from "@/lib/gift-cards/denominations";
import {
  NsGiftsApiError,
  checkBalance,
  createOrder,
  getOrderInfo,
  payOrder,
} from "@/lib/ns-gifts/client";
import { notifyPsAccountStock } from "@/lib/notifications/telegram";
import { PS_ACCOUNT_LOW_STOCK, psAccountRegionLabel } from "@/lib/ps-accounts/config";

// A 'fulfilling' order whose lease is older than this is considered abandoned
// (crash / deploy restart mid-fulfilment) and may be re-claimed by the worker.
export const FULFILLMENT_LEASE_MINUTES = 10;

// Post-payment fulfilment. Warehouse-first: a gift-card line is delivered from
// local encrypted inventory (gift_card_inventory) when we have codes; only the
// shortfall is bought on demand from NS.gifts, into the same inventory, so the
// existing reserve→email pipeline then delivers it unchanged.
//
// Idempotent + resumable: each NS.gifts purchase uses a deterministic custom_id
// (the order_item id), so a retry recovers the same NS.gifts order instead of
// paying twice; codes are de-duplicated by fingerprint. Safe to call repeatedly
// (callback fast-path + reconcile worker).

const num = (s: string | number | null | undefined): number => {
  const n = typeof s === "number" ? s : Number.parseFloat(String(s ?? ""));
  return Number.isFinite(n) ? n : Number.NaN;
};

class FulfillmentError extends Error {}

/**
 * Fulfil every unfulfilled line of a paid order. Never throws — on any problem
 * the order is parked in `manual_review` for a human, and money already spent
 * on NS.gifts is always written to the log.
 */
export async function fulfillOrder(orderId: string): Promise<void> {
  const order = await sql.begin(async (tx) => {
    const [row] = await tx`
      SELECT id, public_id, status, fulfillment_started_at
      FROM orders WHERE id = ${orderId} FOR UPDATE
    `;
    if (!row) return null;
    // Fulfillable states: freshly paid, parked for review, or a stale
    // 'fulfilling' lease left behind by a crashed/restarted attempt. An active
    // 'fulfilling' lease (started recently) is skipped so two ticks don't race.
    const claimable =
      row.status === "paid" ||
      row.status === "manual_review" ||
      (row.status === "fulfilling" &&
        row.fulfillment_started_at !== null &&
        Date.now() - new Date(row.fulfillment_started_at).getTime() >
          FULFILLMENT_LEASE_MINUTES * 60_000);
    if (!claimable) return null;
    await tx`
      UPDATE orders
      SET status = 'fulfilling', fulfillment_started_at = now(), updated_at = now()
      WHERE id = ${orderId}
    `;
    return row;
  });
  if (!order) return;

  try {
    const items = await sql`
      SELECT
        oi.id, oi.item_type, oi.denomination_id, oi.quantity,
        oi.unit_price_minor, oi.fulfillment_status, oi.metadata,
        d.ns_gifts_service_id
      FROM order_items oi
      LEFT JOIN gift_card_denominations d ON d.id = oi.denomination_id
      WHERE oi.order_id = ${orderId}
      ORDER BY oi.created_at
    `;

    let hasGiftCards = false;
    let hasPsAccounts = false;
    for (const item of items) {
      if (item.fulfillment_status === "fulfilled") continue;
      if (item.item_type === "gift_card") {
        hasGiftCards = true;
        await ensureGiftCardStock({
          itemId: String(item.id),
          denominationId: String(item.denomination_id),
          quantity: Number(item.quantity),
          unitPriceMinor: Number(item.unit_price_minor),
          nsServiceId:
            item.ns_gifts_service_id === null
              ? null
              : Number(item.ns_gifts_service_id),
        });
      } else if (
        item.item_type === "steam_topup" ||
        item.item_type === "telegram_stars"
      ) {
        await fulfillTopUp({
          orderId,
          itemId: String(item.id),
          itemType: item.item_type,
          unitPriceMinor: Number(item.unit_price_minor),
          metadata: (item.metadata ?? {}) as Record<string, unknown>,
        });
      } else if (item.item_type === "ps_account") {
        // Delivered from local encrypted inventory (ps_accounts) below.
        hasPsAccounts = true;
      } else {
        throw new FulfillmentError(
          `Fulfilment for ${item.item_type} is not wired yet`,
        );
      }
    }

    // Gift cards: reserve the (now in-stock) codes + queue the delivery email.
    if (hasGiftCards) await reserveAndDeliverGiftCards(orderId);
    // PS accounts: reserve from local stock, credentials surface in the ЛК.
    if (hasPsAccounts) await reserveAndDeliverPsAccounts(orderId);
    // Flip the order to fulfilled + credit loyalty once every line is done.
    await finalizeOrder(orderId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "fulfilment failed";
    await sql`
      UPDATE orders SET status = 'manual_review', updated_at = now()
      WHERE id = ${orderId}
    `;
    console.error(`[fulfillment] order=${orderId}: ${reason}`);
  }
}

/**
 * Guarantee the denomination has at least `quantity` available local codes,
 * buying the shortfall from NS.gifts. Guarded by a balance check and a price
 * cap (wholesale must not exceed what we charged) so a pricing/FX glitch parks
 * the order instead of over-spending.
 */
async function ensureGiftCardStock(item: {
  itemId: string;
  denominationId: string;
  quantity: number;
  unitPriceMinor: number;
  nsServiceId: number | null;
}): Promise<void> {
  // This count is deliberately NOT in the same transaction as the reservation
  // in reserveAndDeliverGiftCards. Two concurrent orders for the same
  // denomination can therefore both see the same available codes and skip the
  // NS.gifts top-up; the loser then fails its FOR UPDATE SKIP LOCKED reserve and
  // is parked in manual_review. This is self-healing: the reconcile worker
  // retries it within ~1–2 minutes and buys the shortfall on the next pass. Kept
  // as-is on purpose — a cross-order lock here would serialise all sales of a
  // denomination for a rare, auto-recovered race.
  const [{ available }] = await sql`
    SELECT COUNT(*)::int AS available
    FROM gift_card_inventory
    WHERE denomination_id = ${item.denominationId} AND status = 'available'
  `;
  const shortfall = item.quantity - Number(available);
  if (shortfall <= 0) return;

  if (item.nsServiceId === null) {
    throw new FulfillmentError(
      `No local stock and no NS.gifts service mapped for denomination ${item.denominationId}`,
    );
  }

  // NS.gifts requires custom_id to be a valid UUID4; the order_item id already
  // is one, so reuse it — deterministic (a retry recovers the same NS.gifts
  // order, never double-pays) and valid.
  const customId = item.itemId;
  await sql`
    UPDATE order_items SET ns_custom_id = ${customId} WHERE id = ${item.itemId}
  `;

  // Create the NS.gifts order, or recover it if a prior attempt already did
  // (create-409). Recovery keeps the price cap honest by re-reading the quote.
  const recovered = await createOrRecoverOrder({
    serviceId: item.nsServiceId,
    customId,
    fields: [{ key: "quantity", value: shortfall }],
  });

  // Already paid AND delivered on a prior attempt → recover the codes and stop.
  // addInventoryCodes de-dupes by fingerprint, so replaying this is safe. (If
  // the order was for a different quantity, any resulting shortfall surfaces in
  // reserveAndDeliverGiftCards — extra codes just enrich inventory.)
  if (recovered.existingPins?.length) {
    await addInventoryCodes({
      denominationId: item.denominationId,
      codes: recovered.existingPins,
      supplierReference: `ns.gifts:${customId}`,
    });
    return;
  }

  // The NS order's quantity is baked at first create and immutable. If local
  // stock moved between attempts, the recovered (unpaid) order is for the wrong
  // count — paying it would either trip the cap (stock grew) or under-buy (stock
  // sold out from under us). Fail with a clear message; a human reconciles via
  // the admin buy tool, which can re-buy the correct amount under a new id.
  if (
    recovered.existingQuantity !== null &&
    recovered.existingQuantity !== shortfall
  ) {
    throw new FulfillmentError(
      `NS.gifts order ${customId} was created for qty ${recovered.existingQuantity}, ` +
        `but ${shortfall} are needed now (local stock changed between attempts) — reconcile via admin`,
    );
  }

  // Price cap: never pay more than we charged for the shortfall. NS quotes in
  // its balance currency; comparing to the ruble sale total is a safe upper
  // bound (it only blocks absurd over-quotes, never legitimate wholesale).
  const quote = recovered.totalToPay;
  const capMinor = item.unitPriceMinor * shortfall;
  if (!Number.isFinite(quote) || quote * 100 > capMinor) {
    throw new FulfillmentError(
      `NS.gifts quote ${quote} exceeds price cap for ${customId}`,
    );
  }
  const { balance } = await checkBalance();
  if (!(num(balance) >= quote)) {
    throw new FulfillmentError(
      `Insufficient NS.gifts balance ${balance} for quote ${quote}`,
    );
  }

  const pins = await payGiftCardOrder(customId);
  // Never log the codes themselves — they're bearer secrets. custom_id is the
  // recovery handle: getOrderInfo(custom_id) re-fetches the pins from NS.gifts.
  console.log(
    `[fulfillment] bought custom_id=${customId} qty=${shortfall} codes=${pins.length}`,
  );
  await addInventoryCodes({
    denominationId: item.denominationId,
    codes: pins,
    supplierReference: `ns.gifts:${customId}`,
  });
}

/**
 * Create an NS.gifts order, or recover the existing one when a prior attempt
 * already created it (createOrder → HTTP 409). Returns the price to pay — so the
 * price cap still applies on the recovery path — and any pins already issued (a
 * gift-card line delivered on a prior attempt).
 *
 * A 409 on its own is NOT proof of payment: create and pay are separate calls,
 * and a top-up returns no pins to prove it either way. Callers must always drive
 * payOrder afterwards (it is the idempotent commit), never mark a line fulfilled
 * off a create-409 alone.
 *
 * `existingQuantity` is the quantity baked into the recovered NS order (null on
 * a fresh create). The quantity is fixed at first create and cannot change, so a
 * caller whose needed quantity has since shifted (local stock moved between
 * attempts) can detect the mismatch and fail with a clear message instead of a
 * downstream "cap exceeded" / "not enough inventory".
 */
async function createOrRecoverOrder(input: {
  serviceId: number;
  customId: string;
  fields: Array<{ key: string; value: string | number }>;
}): Promise<{
  totalToPay: number;
  existingPins: string[] | null;
  existingQuantity: number | null;
}> {
  try {
    const created = await createOrder(input);
    return {
      totalToPay: num(created.total_to_pay),
      existingPins: null,
      existingQuantity: null,
    };
  } catch (error) {
    if (error instanceof NsGiftsApiError && error.status === 409) {
      const info = await getOrderInfo(input.customId);
      return {
        totalToPay: num(info.total_price),
        existingPins: info.pins ?? null,
        existingQuantity: Number.isFinite(info.quantity)
          ? Number(info.quantity)
          : null,
      };
    }
    throw error;
  }
}

/** payOrder with 409-safe recovery (a retried order is already paid upstream). */
async function payGiftCardOrder(customId: string): Promise<string[]> {
  try {
    const paid = await payOrder({ customId });
    if (paid.status !== "completed" || !paid.pins?.length) {
      throw new FulfillmentError(
        `Purchase not completed: ${paid.status} ${paid.note ?? ""}`.trim(),
      );
    }
    return paid.pins;
  } catch (error) {
    // Already paid on a previous attempt → recover the codes from order_info.
    if (error instanceof NsGiftsApiError && error.status === 409) {
      const info = await getOrderInfo(customId);
      if (info.pins?.length) return info.pins;
    }
    throw error;
  }
}

/**
 * Reserve one code per unit for each gift-card line, mark it delivered, and
 * queue the notification email. The customer's codes are visible in their
 * account (ЛК) as soon as this runs — the email is a notification, not the
 * delivery of record. Order-level finalisation happens in finalizeOrder.
 */
async function reserveAndDeliverGiftCards(orderId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [order] = await tx`
      SELECT o.id, o.public_id, c.email
      FROM orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ${orderId} FOR UPDATE OF o
    `;
    if (!order) throw new FulfillmentError("Order vanished during fulfilment");

    const items = await tx`
      SELECT id, denomination_id, quantity, title
      FROM order_items
      WHERE order_id = ${orderId} AND item_type = 'gift_card'
        AND fulfillment_status <> 'fulfilled'
      ORDER BY created_at
    `;

    const itemLabels: string[] = [];
    for (const item of items) {
      const quantity = Number(item.quantity);
      const cards = await tx`
        SELECT id FROM gift_card_inventory
        WHERE denomination_id = ${item.denomination_id} AND status = 'available'
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${quantity}
      `;
      if (cards.length !== quantity) {
        throw new FulfillmentError("Not enough inventory after NS.gifts top-up");
      }
      for (const card of cards) {
        await tx`
          UPDATE gift_card_inventory
          SET status = 'delivered', reserved_order_item_id = ${item.id},
              reserved_at = now(), delivered_at = now()
          WHERE id = ${card.id}
        `;
        await tx`
          INSERT INTO fulfillment_deliveries (order_item_id, gift_card_id, recipient_email, delivered_at)
          VALUES (${item.id}, ${card.id}, ${order.email}, now())
          ON CONFLICT (order_item_id, gift_card_id) DO NOTHING
        `;
      }
      await tx`
        UPDATE order_items
        SET fulfillment_status = 'fulfilled', fulfilled_at = now()
        WHERE id = ${item.id}
      `;
      const label = typeof item.title === "string" && item.title ? item.title : "Цифровой товар";
      itemLabels.push(quantity > 1 ? `${label} × ${quantity}` : label);
    }

    // Code-free "ready" notification (best-effort). The code is NOT emailed — it
    // is revealed only in the account (ЛК), behind auth, after the customer
    // accepts the reveal warning. The account is the delivery of record.
    await tx`
      INSERT INTO email_outbox (event_key, template, recipient_email, payload)
      VALUES (
        ${`gift-card-ready:${order.id}`},
        'gift-card-ready',
        ${order.email},
        ${sql.json({ publicOrderId: order.public_id, items: itemLabels })}
      )
      ON CONFLICT (event_key) DO NOTHING
    `;
  });
}

/**
 * Reserve one ready-made PlayStation account per unit from local encrypted
 * inventory (ps_accounts), mark it delivered, and mark the line fulfilled. The
 * credentials are NOT emailed — they surface in the customer's account (ЛК),
 * which is the delivery of record; the email is a credential-free "ready"
 * notification. After committing, a Telegram alert fires for any region at or
 * below the low-stock threshold so the warehouse can be topped up.
 */
async function reserveAndDeliverPsAccounts(orderId: string): Promise<void> {
  const stock = await sql.begin(async (tx) => {
    const [order] = await tx`
      SELECT o.id, o.public_id, c.email
      FROM orders o JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ${orderId} FOR UPDATE OF o
    `;
    if (!order) throw new FulfillmentError("Order vanished during fulfilment");

    const items = await tx`
      SELECT id, quantity, metadata
      FROM order_items
      WHERE order_id = ${orderId} AND item_type = 'ps_account'
        AND fulfillment_status <> 'fulfilled'
      ORDER BY created_at
    `;

    const regions = new Set<string>();
    for (const item of items) {
      const meta = (item.metadata ?? {}) as Record<string, unknown>;
      const region = typeof meta.region === "string" ? meta.region : "";
      if (!region) {
        throw new FulfillmentError(`PS account line ${item.id} has no region`);
      }
      const qty = Number(item.quantity);
      const accounts = await tx`
        SELECT id FROM ps_accounts
        WHERE region = ${region} AND status = 'available'
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${qty}
      `;
      if (accounts.length !== qty) {
        // Sold out for this region — park for a human and alert (below); no
        // partial delivery.
        throw new FulfillmentError(
          `Not enough PlayStation accounts in stock for region ${region}`,
        );
      }
      for (const account of accounts) {
        await tx`
          UPDATE ps_accounts
          SET status = 'delivered', reserved_order_item_id = ${item.id},
              reserved_at = now(), delivered_at = now()
          WHERE id = ${account.id}
        `;
      }
      await tx`
        UPDATE order_items
        SET fulfillment_status = 'fulfilled', fulfilled_at = now()
        WHERE id = ${item.id}
      `;
      regions.add(region);
    }

    // Credential-free availability notification (best-effort). The ЛК holds the
    // actual credentials, behind auth.
    if (regions.size > 0) {
      await tx`
        INSERT INTO email_outbox (event_key, template, recipient_email, payload)
        VALUES (
          ${`ps-account-ready:${order.id}`},
          'ps-account-ready',
          ${order.email},
          ${sql.json({
            publicOrderId: order.public_id,
            regions: [...regions].map(psAccountRegionLabel),
          })}
        )
        ON CONFLICT (event_key) DO NOTHING
      `;
    }

    // Remaining available stock per delivered region, for the stock alert.
    const remaining: Array<{ region: string; remaining: number }> = [];
    for (const region of regions) {
      const [{ n }] = await tx`
        SELECT COUNT(*)::int AS n FROM ps_accounts
        WHERE region = ${region} AND status = 'available'
      `;
      remaining.push({ region, remaining: Number(n) });
    }
    return remaining;
  });

  // Fire stock alerts outside the transaction (best-effort, never blocks).
  for (const entry of stock) {
    if (entry.remaining <= PS_ACCOUNT_LOW_STOCK) {
      await notifyPsAccountStock({
        region: entry.region,
        regionLabel: psAccountRegionLabel(entry.region),
        remaining: entry.remaining,
      });
    }
  }
}

/**
 * Execute a wallet top-up on NS.gifts: Steam balance (fields account + amount)
 * or Telegram Stars (field account_number). No code is returned — the balance
 * is credited directly. Idempotent via the order_item id as custom_id; a retry
 * that hits "already paid" (409) is treated as done.
 */
async function fulfillTopUp(item: {
  orderId: string;
  itemId: string;
  itemType: "steam_topup" | "telegram_stars";
  unitPriceMinor: number;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const serviceId = Number(item.metadata.ns_service_id);
  if (!Number.isInteger(serviceId) || serviceId <= 0) {
    throw new FulfillmentError(`No NS.gifts service_id in metadata for ${item.itemId}`);
  }

  const fields: Array<{ key: string; value: string | number }> =
    item.itemType === "steam_topup"
      ? [
          { key: "account", value: String(item.metadata.steam_account ?? "") },
          { key: "amount", value: Number(item.metadata.amount_usd) },
        ]
      : [
          {
            key: "account_number",
            value: String(item.metadata.telegram_username ?? ""),
          },
        ];

  const customId = item.itemId;
  await sql`
    UPDATE order_items SET ns_custom_id = ${customId} WHERE id = ${item.itemId}
  `;

  // Create the order, or recover the quote if a prior attempt already created it
  // (create-409). A top-up returns no pins, so a 409 can NOT prove the balance
  // was credited — we must still drive payOrder below. Re-reading the quote here
  // keeps the price cap effective even on the recovery path (e.g. a first
  // attempt that created the order but tripped the cap before paying).
  const recovered = await createOrRecoverOrder({ serviceId, customId, fields });

  const quote = recovered.totalToPay;
  if (!Number.isFinite(quote) || quote * 100 > item.unitPriceMinor) {
    throw new FulfillmentError(
      `NS.gifts quote ${quote} exceeds price cap for ${customId}`,
    );
  }
  const { balance } = await checkBalance();
  if (!(num(balance) >= quote)) {
    throw new FulfillmentError(
      `Insufficient NS.gifts balance ${balance} for quote ${quote}`,
    );
  }

  // payOrder is the idempotent commit: an unpaid order gets paid now, an
  // already-paid one returns 409. Only these outcomes mark the line fulfilled —
  // never a create-409 on its own.
  try {
    const paid = await payOrder({ customId });
    if (paid.status !== "completed" && paid.status !== "in_progress") {
      throw new FulfillmentError(
        `Top-up not completed: ${paid.status} ${paid.note ?? ""}`.trim(),
      );
    }
    console.log(
      `[fulfillment] top-up custom_id=${customId} type=${item.itemType} status=${paid.status} balance=${paid.balance}`,
    );
  } catch (error) {
    // 409 = already paid on a prior attempt → the balance was already credited.
    if (!(error instanceof NsGiftsApiError && error.status === 409)) throw error;
  }

  await markItemFulfilled(item.itemId);
  await queueTopUpConfirmation(item);
}

/**
 * Queue a top-up confirmation email (best-effort). Keyed by the order_item id so
 * a fulfilment retry never sends twice. Steam credits a login; Telegram Stars a
 * @username — the target and amount come straight from the line's metadata.
 */
async function queueTopUpConfirmation(item: {
  orderId: string;
  itemId: string;
  itemType: "steam_topup" | "telegram_stars";
  metadata: Record<string, unknown>;
}): Promise<void> {
  const [order] = await sql`
    SELECT o.public_id, c.email
    FROM orders o JOIN customers c ON c.id = o.customer_id
    WHERE o.id = ${item.orderId}
  `;
  if (!order?.email) return;

  const isSteam = item.itemType === "steam_topup";
  const target = isSteam
    ? String(item.metadata.steam_account ?? "")
    : `@${String(item.metadata.telegram_username ?? "").replace(/^@+/, "")}`;
  const amountLabel = isSteam
    ? `${item.metadata.amount ?? ""} ${item.metadata.currency ?? ""}`.trim()
    : `${item.metadata.stars ?? ""} ⭐`;

  await sql`
    INSERT INTO email_outbox (event_key, template, recipient_email, payload)
    VALUES (
      ${`topup-confirmation:${item.itemId}`},
      'topup-confirmation',
      ${order.email},
      ${sql.json({
        publicOrderId: order.public_id,
        kind: isSteam ? "steam" : "telegram",
        target,
        amountLabel,
      })}
    )
    ON CONFLICT (event_key) DO NOTHING
  `;
}

async function markItemFulfilled(itemId: string): Promise<void> {
  await sql`
    UPDATE order_items
    SET fulfillment_status = 'fulfilled', fulfilled_at = now()
    WHERE id = ${itemId}
  `;
}

/**
 * Flip the order to `fulfilled` and credit loyalty once every line is done.
 * Idempotent (creditFulfilledOrder no-ops on replay).
 */
async function finalizeOrder(orderId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [order] = await tx`
      SELECT id, customer_id, total_minor, status
      FROM orders WHERE id = ${orderId} FOR UPDATE
    `;
    if (!order) throw new FulfillmentError("Order vanished during fulfilment");

    const [{ pending }] = await tx`
      SELECT COUNT(*)::int AS pending
      FROM order_items
      WHERE order_id = ${orderId} AND fulfillment_status <> 'fulfilled'
    `;
    if (Number(pending) > 0) {
      throw new FulfillmentError(`${pending} line(s) not fulfilled`);
    }

    await tx`
      UPDATE orders
      SET status = 'fulfilled', fulfilled_at = now(), updated_at = now()
      WHERE id = ${orderId}
    `;
    await creditFulfilledOrder(tx, {
      orderId: String(order.id),
      customerId: String(order.customer_id),
      eligibleSpendMinor: Number(order.total_minor),
    });
  });
}
