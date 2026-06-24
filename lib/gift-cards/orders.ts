import { randomBytes } from "node:crypto";
import type { JSONValue } from "postgres";
import { ensureLoyaltyAccount } from "@/lib/account/loyalty";
import { sql } from "@/lib/db";

type CreateGiftCardOrderInput = {
  email: string;
  denominationId: string;
  quantity: number;
  idempotencyKey: string;
};

export async function createGiftCardOrder(input: CreateGiftCardOrderInput) {
  return sql.begin(async (transaction) => {
    const [denomination] = await transaction`
      SELECT
        retail.id,
        retail.currency,
        retail.amount_minor,
        retail.sale_currency,
        retail.sale_price_minor,
        denominations.loyalty_discount_eligible
      FROM gift_card_retail_prices retail
      JOIN gift_card_denominations denominations
        ON denominations.id = retail.id
      WHERE retail.id = ${input.denominationId} AND retail.active = true
      FOR SHARE OF denominations
    `;

    if (!denomination) throw new Error("Gift card denomination is unavailable");
    if (denomination.sale_price_minor === null) {
      throw new Error("Gift card retail price is not configured");
    }
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new Error("Quantity must be a positive integer");
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const [customer] = await transaction`
      INSERT INTO customers (email)
      VALUES (${normalizedEmail})
      ON CONFLICT (email) DO UPDATE SET updated_at = now()
      RETURNING id, email
    `;

    await transaction`
      INSERT INTO customer_profiles (customer_id)
      VALUES (${customer.id})
      ON CONFLICT (customer_id) DO NOTHING
    `;

    const loyalty = await ensureLoyaltyAccount(transaction, customer.id);
    const unitPriceMinor = Number(denomination.sale_price_minor);
    const subtotalMinor = unitPriceMinor * input.quantity;
    const loyaltyDiscountBasisPoints = denomination.loyalty_discount_eligible
      ? Number(loyalty.current_discount_basis_points)
      : 0;
    const discountMinor = Math.floor(
      (subtotalMinor * loyaltyDiscountBasisPoints) / 10000,
    );
    const totalMinor = subtotalMinor - discountMinor;
    const publicId = `LS-${randomBytes(6).toString("hex").toUpperCase()}`;
    const [order] = await transaction`
      INSERT INTO orders (
        public_id,
        customer_id,
        currency,
        subtotal_minor,
        discount_minor,
        total_minor,
        loyalty_discount_basis_points,
        loyalty_tier_code,
        idempotency_key
      )
      SELECT
        ${publicId},
        ${customer.id},
        ${denomination.sale_currency},
        ${subtotalMinor},
        ${discountMinor},
        ${totalMinor},
        ${loyaltyDiscountBasisPoints},
        tiers.code,
        ${input.idempotencyKey}
      FROM loyalty_tiers tiers
      WHERE tiers.id = ${loyalty.tier_id}
      ON CONFLICT (idempotency_key) DO UPDATE SET
        idempotency_key = EXCLUDED.idempotency_key
      RETURNING
        id,
        public_id,
        customer_id,
        status,
        currency,
        subtotal_minor,
        discount_minor,
        total_minor,
        loyalty_discount_basis_points,
        loyalty_tier_code
    `;

    const [existingItem] = await transaction`
      SELECT id, denomination_id, quantity
      FROM order_items
      WHERE order_id = ${order.id}
      LIMIT 1
    `;

    if (existingItem) {
      if (
        order.customer_id !== customer.id ||
        existingItem.denomination_id !== denomination.id ||
        Number(existingItem.quantity) !== input.quantity ||
        Number(order.subtotal_minor) !== subtotalMinor
      ) {
        throw new Error(
          "Idempotency key was already used with different order data",
        );
      }
    } else {
      await transaction`
        INSERT INTO order_items (
          order_id,
          item_type,
          denomination_id,
          quantity,
          unit_price_minor
        )
        VALUES (
          ${order.id},
          'gift_card',
          ${denomination.id},
          ${input.quantity},
          ${unitPriceMinor}
        )
      `;
    }

    return order;
  });
}

type ConfirmPaymentInput = {
  orderId: string;
  provider: string;
  providerPaymentId: string;
  amountMinor: number;
  currency: string;
  rawPayload: JSONValue;
};

export async function confirmPaymentAndQueueFulfillment(
  input: ConfirmPaymentInput,
) {
  return sql.begin(async (transaction) => {
    const [order] = await transaction`
      SELECT
        orders.id,
        orders.public_id,
        orders.status,
        orders.total_minor,
        orders.currency,
        customers.email
      FROM orders
      JOIN customers ON customers.id = orders.customer_id
      WHERE orders.id = ${input.orderId}
      FOR UPDATE OF orders
    `;

    if (!order) throw new Error("Order not found");
    if (
      Number(order.total_minor) !== input.amountMinor ||
      order.currency !== input.currency
    ) {
      await transaction`
        UPDATE orders SET status = 'manual_review', updated_at = now()
        WHERE id = ${order.id}
      `;
      throw new Error("Payment amount or currency does not match the order");
    }

    const [payment] = await transaction`
      INSERT INTO payments (
        order_id,
        provider,
        provider_payment_id,
        status,
        amount_minor,
        currency,
        raw_payload
      )
      VALUES (
        ${order.id},
        ${input.provider},
        ${input.providerPaymentId},
        'succeeded',
        ${input.amountMinor},
        ${input.currency},
        ${sql.json(input.rawPayload)}
      )
      ON CONFLICT (provider, provider_payment_id) DO UPDATE SET
        raw_payload = EXCLUDED.raw_payload,
        updated_at = now()
      RETURNING order_id
    `;

    if (payment.order_id !== order.id) {
      throw new Error("Provider payment ID belongs to another order");
    }

    if (order.status === "fulfilled" || order.status === "fulfilling") {
      return { orderId: order.id, alreadyQueued: true };
    }

    const items = await transaction`
      SELECT id, denomination_id, quantity
      FROM order_items
      WHERE order_id = ${order.id} AND item_type = 'gift_card'
      ORDER BY created_at
    `;

    const deliveryIds: string[] = [];

    for (const item of items) {
      const cards = await transaction`
        SELECT id
        FROM gift_card_inventory
        WHERE denomination_id = ${item.denomination_id}
          AND status = 'available'
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT ${item.quantity}
      `;

      if (cards.length !== Number(item.quantity)) {
        await transaction`
          UPDATE orders SET status = 'manual_review', updated_at = now()
          WHERE id = ${order.id}
        `;
        throw new Error("Not enough gift card inventory");
      }

      for (const card of cards) {
        await transaction`
          UPDATE gift_card_inventory
          SET
            status = 'reserved',
            reserved_order_item_id = ${item.id},
            reserved_at = now()
          WHERE id = ${card.id}
        `;

        const [delivery] = await transaction`
          INSERT INTO fulfillment_deliveries (
            order_item_id,
            gift_card_id,
            recipient_email
          )
          VALUES (${item.id}, ${card.id}, ${order.email})
          RETURNING id
        `;
        deliveryIds.push(delivery.id);
      }
    }

    await transaction`
      INSERT INTO email_outbox (
        event_key,
        template,
        recipient_email,
        payload
      )
      VALUES (
        ${`gift-card-delivery:${order.id}`},
        'gift-card-delivery',
        ${order.email},
        ${sql.json({
          orderId: order.id,
          publicOrderId: order.public_id,
          deliveryIds,
        })}
      )
      ON CONFLICT (event_key) DO NOTHING
    `;

    await transaction`
      UPDATE orders
      SET status = 'fulfilling', paid_at = now(), updated_at = now()
      WHERE id = ${order.id}
    `;

    return { orderId: order.id, alreadyQueued: false };
  });
}
