import { sql } from "@/lib/db";
import { creditFulfilledOrder } from "@/lib/account/loyalty";
import { decryptGiftCardCode } from "@/lib/gift-cards/crypto";
import type { EmailProvider } from "@/lib/email/types";

export async function processOneEmailOutbox(provider: EmailProvider) {
  const message = await sql.begin(async (transaction) => {
    const [outbox] = await transaction`
      SELECT id, event_key, recipient_email, payload
      FROM email_outbox
      WHERE status IN ('pending', 'retry')
        AND next_attempt_at <= now()
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;

    if (!outbox) return null;

    await transaction`
      UPDATE email_outbox
      SET status = 'processing', locked_at = now(), attempts = attempts + 1
      WHERE id = ${outbox.id}
    `;

    return outbox;
  });

  if (!message) return false;

  try {
    const payload = message.payload as {
      orderId: string;
      publicOrderId: string;
      deliveryIds: string[];
    };
    const deliveries = await sql`
      SELECT
        deliveries.id,
        cards.id AS card_id,
        cards.code_ciphertext,
        cards.code_iv,
        cards.code_auth_tag,
        denominations.amount_minor,
        denominations.currency
      FROM fulfillment_deliveries deliveries
      JOIN gift_card_inventory cards ON cards.id = deliveries.gift_card_id
      JOIN gift_card_denominations denominations
        ON denominations.id = cards.denomination_id
      WHERE deliveries.id IN ${sql(payload.deliveryIds)}
      ORDER BY deliveries.created_at
    `;

    await provider.sendGiftCardDelivery({
      eventKey: message.event_key,
      recipient: message.recipient_email,
      publicOrderId: payload.publicOrderId,
      cards: deliveries.map((delivery) => ({
        denominationMinor: Number(delivery.amount_minor),
        currency: delivery.currency,
        code: decryptGiftCardCode({
          ciphertext: delivery.code_ciphertext,
          iv: delivery.code_iv,
          authTag: delivery.code_auth_tag,
        }),
      })),
    });

    await sql.begin(async (transaction) => {
      const [order] = await transaction`
        SELECT id, customer_id, total_minor
        FROM orders
        WHERE id = ${payload.orderId}
        FOR UPDATE
      `;
      if (!order) throw new Error("Order not found while completing delivery");

      await transaction`
        UPDATE fulfillment_deliveries
        SET delivered_at = now()
        WHERE id IN ${sql(payload.deliveryIds)}
      `;
      await transaction`
        UPDATE gift_card_inventory
        SET status = 'delivered', delivered_at = now()
        WHERE id IN ${sql(deliveries.map((delivery) => delivery.card_id))}
      `;
      await transaction`
        UPDATE orders
        SET status = 'fulfilled', fulfilled_at = now(), updated_at = now()
        WHERE id = ${order.id}
      `;
      await creditFulfilledOrder(transaction, {
        orderId: order.id,
        customerId: order.customer_id,
        eligibleSpendMinor: Number(order.total_minor),
      });
      await transaction`
        UPDATE email_outbox
        SET status = 'sent', sent_at = now(), locked_at = null, updated_at = now()
        WHERE id = ${message.id}
      `;
    });

    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Email send failed";
    await sql`
      UPDATE email_outbox
      SET
        status = CASE WHEN attempts >= 8 THEN 'failed' ELSE 'retry' END,
        next_attempt_at = now() + (
          LEAST(60, power(2, LEAST(attempts, 5))) * interval '1 minute'
        ),
        locked_at = null,
        last_error = ${reason},
        updated_at = now()
      WHERE id = ${message.id}
    `;
    throw error;
  }
}
