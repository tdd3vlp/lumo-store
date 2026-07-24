import "server-only";
import { dayBucket } from "@/lib/audit/day-bucket";
import { auditRepository } from "@/lib/audit/repository";
import { auditService } from "@/lib/audit/service";
import type { ClientSignals, RequestContext } from "@/lib/audit/types";
import { sql } from "@/lib/db";
import { decryptGiftCardCode } from "@/lib/gift-cards/crypto";

// Code Delivery Service — the only place a gift-card code is decrypted for the
// customer. Enforces: (1) the item belongs to the caller; (2) the reveal is
// journalled BEFORE the code is returned; (3) if journalling fails the whole
// transaction rolls back and no code is handed out. The first successful reveal
// after accepting the warning is the official moment of digital-goods transfer.

export class CodeDeliveryError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CodeDeliveryError";
  }
}

// Order states in which a code may be revealed. Deliveries only appear after
// payment, so this is belt-and-suspenders today — but it explicitly blocks
// reveal for refunded / cancelled / manual_review / pending orders (a refund or
// dispute must stop code delivery), per the spec's "unpaid order" edge case.
const REVEALABLE_ORDER_STATUSES = new Set(["paid", "fulfilling", "fulfilled"]);

export type RevealInput = {
  customerId: string;
  orderItemId: string;
  acceptedWarning: boolean;
  warningVersion: number;
  /** Idempotency token for this reveal action (double-submit guard). */
  clientEventId: string;
  context: RequestContext;
  signals: ClientSignals;
};

export type RevealOutcome = { codes: string[]; firstReveal: boolean };

export async function revealGiftCardCodes(
  input: RevealInput,
): Promise<RevealOutcome> {
  if (!input.acceptedWarning) {
    throw new CodeDeliveryError("Условия получения не приняты.", 400);
  }

  return sql.begin(async (tx) => {
    // 1. Ownership + serialize against concurrent reveals of the same item.
    //    Status is selected (not filtered) so we can 404 "not yours/none" vs
    //    409 "wrong status" distinctly.
    const [item] = await tx`
      SELECT items.id, items.denomination_id,
             orders.id AS order_id, orders.status AS order_status
      FROM order_items items
      JOIN orders ON orders.id = items.order_id
      WHERE items.id = ${input.orderItemId}
        AND orders.customer_id = ${input.customerId}
      FOR UPDATE OF items
    `;
    if (!item) throw new CodeDeliveryError("Заказ не найден.", 404);

    if (!REVEALABLE_ORDER_STATUSES.has(String(item.order_status))) {
      throw new CodeDeliveryError("Заказ недоступен для выдачи кода.", 409);
    }

    const orderId = String(item.order_id);
    const productId =
      item.denomination_id === null ? null : String(item.denomination_id);

    // 2. Delivered codes for this line (still encrypted at this point).
    const rows = await tx`
      SELECT cards.id AS code_id,
             cards.code_ciphertext, cards.code_iv, cards.code_auth_tag
      FROM fulfillment_deliveries deliveries
      JOIN gift_card_inventory cards ON cards.id = deliveries.gift_card_id
      WHERE deliveries.order_item_id = ${input.orderItemId}
      ORDER BY deliveries.created_at
    `;
    if (rows.length === 0) {
      throw new CodeDeliveryError("Код ещё не готов.", 409);
    }

    // 3. First reveal vs. re-open, decided PER CODE (locked by FOR UPDATE above
    //    → race-free): a code delivered later (e.g. re-fulfilment after an
    //    incident) still records its own first show as CODE_REVEALED.
    const revealed = await auditRepository.revealedCodeIds(
      input.orderItemId,
      tx,
    );

    // 4. Journal FIRST. Deterministic keys keep the transfer-of-record events
    //    exact and forever-unique (first WARNING_ACCEPTED for the item, each
    //    code's first CODE_REVEALED), while repeat access (re-accept, re-open) is
    //    bucketed by (item, UTC-day) so re-click/reload spam collapses to one row
    //    per day instead of growing the append-only journal unbounded.
    const day = dayBucket();
    const firstEverForItem = revealed.size === 0;
    await auditService.record(
      "WARNING_ACCEPTED",
      {
        eventKey: firstEverForItem
          ? `WARNING_ACCEPTED:${input.orderItemId}`
          : `WARNING_ACCEPTED:${input.orderItemId}:${day}`,
        refs: { orderId, orderItemId: input.orderItemId, customerId: input.customerId, productId },
        context: input.context,
        signals: input.signals,
        warningVersion: input.warningVersion,
      },
      tx,
    );

    let anyFirstReveal = false;
    for (const row of rows) {
      const codeId = String(row.code_id);
      const isFirst = !revealed.has(codeId);
      if (isFirst) anyFirstReveal = true;
      const eventKey = isFirst
        ? `CODE_REVEALED:${input.orderItemId}:${codeId}`
        : `CODE_REOPENED:${input.orderItemId}:${codeId}:${day}`;
      await auditService.record(
        isFirst ? "CODE_REVEALED" : "CODE_REOPENED",
        {
          eventKey,
          refs: {
            orderId,
            orderItemId: input.orderItemId,
            customerId: input.customerId,
            productId,
            codeId,
          },
          context: input.context,
          signals: input.signals,
          warningVersion: input.warningVersion,
        },
        tx,
      );
    }

    // 5. Journal committed within this tx — now (and only now) decrypt & return.
    const codes = rows.map((row) =>
      decryptGiftCardCode({
        ciphertext: row.code_ciphertext,
        iv: row.code_iv,
        authTag: row.code_auth_tag,
      }),
    );
    return { codes, firstReveal: anyFirstReveal };
  });
}
