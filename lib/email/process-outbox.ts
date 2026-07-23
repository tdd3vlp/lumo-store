import { sql } from "@/lib/db";
import { decryptGiftCardCode } from "@/lib/gift-cards/crypto";
import type { EmailProvider } from "@/lib/email/types";

// Send-only outbox worker: fulfilment (lib/payments/fulfillment.ts) already
// reserves codes, marks them delivered, finalises the order and credits
// loyalty. This just delivers the notification email and marks the row sent,
// retrying with exponential backoff.
export async function processOneEmailOutbox(provider: EmailProvider) {
  const message = await sql.begin(async (transaction) => {
    const [outbox] = await transaction`
      SELECT id, event_key, template, recipient_email, payload
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
    // Wallet top-up confirmation (Steam / Telegram Stars): no code, balance is
    // credited straight to the target account.
    if (message.template === "topup-confirmation") {
      const payload = message.payload as {
        publicOrderId: string;
        kind: "steam" | "telegram";
        target: string;
        amountLabel: string;
      };
      await provider.sendTopUpConfirmation({
        eventKey: message.event_key,
        recipient: message.recipient_email,
        publicOrderId: payload.publicOrderId,
        kind: payload.kind,
        target: payload.target,
        amountLabel: payload.amountLabel,
      });
      await sql`
        UPDATE email_outbox
        SET status = 'sent', sent_at = now(), locked_at = null, updated_at = now()
        WHERE id = ${message.id}
      `;
      return true;
    }

    // PS-account "ready" notification: no codes, credentials live in the ЛК.
    if (message.template === "ps-account-ready") {
      const payload = message.payload as {
        publicOrderId: string;
        regions: string[];
      };
      await provider.sendPsAccountReady({
        eventKey: message.event_key,
        recipient: message.recipient_email,
        publicOrderId: payload.publicOrderId,
        regions: Array.isArray(payload.regions) ? payload.regions : [],
      });
      await sql`
        UPDATE email_outbox
        SET status = 'sent', sent_at = now(), locked_at = null, updated_at = now()
        WHERE id = ${message.id}
      `;
      return true;
    }

    const payload = message.payload as {
      publicOrderId: string;
      deliveryIds: string[];
    };
    const deliveries =
      payload.deliveryIds.length > 0
        ? await sql`
            SELECT
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
          `
        : [];

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

    await sql`
      UPDATE email_outbox
      SET status = 'sent', sent_at = now(), locked_at = null, updated_at = now()
      WHERE id = ${message.id}
    `;
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
