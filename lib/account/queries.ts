import { sql } from "@/lib/db";

export type AccountOverview = {
  customer: {
    id: string;
    email: string;
    displayName: string | null;
    emailVerified: boolean;
  };
  loyalty: {
    tierCode: string;
    tierName: string;
    lifetimeSpendMinor: number;
    discountBasisPoints: number;
    nextTier: {
      code: string;
      name: string;
      requiredSpendMinor: number;
      remainingSpendMinor: number;
      discountBasisPoints: number;
    } | null;
  };
  orders: Array<{
    id: string;
    publicId: string;
    status: string;
    currency: string;
    subtotalMinor: number;
    discountMinor: number;
    totalMinor: number;
    loyaltyDiscountBasisPoints: number;
    createdAt: string;
    paidAt: string | null;
    fulfilledAt: string | null;
    items: Array<{
      id: string;
      quantity: number;
      unitPriceMinor: number;
      denominationMinor: number | null;
    }>;
  }>;
};

export async function getAccountOverview(
  customerId: string,
): Promise<AccountOverview | null> {
  const [customer] = await sql`
    SELECT
      customers.id,
      customers.email,
      customers.email_verified_at,
      profiles.display_name,
      accounts.lifetime_spend_minor,
      accounts.current_discount_basis_points,
      tiers.code AS tier_code,
      tiers.name AS tier_name
    FROM customers
    LEFT JOIN customer_profiles profiles
      ON profiles.customer_id = customers.id
    LEFT JOIN loyalty_accounts accounts
      ON accounts.customer_id = customers.id
    LEFT JOIN loyalty_tiers tiers
      ON tiers.id = accounts.tier_id
    WHERE customers.id = ${customerId}
  `;

  if (!customer) return null;

  const [nextTier] = await sql`
    SELECT code, name, min_lifetime_spend_minor, discount_basis_points
    FROM loyalty_tiers
    WHERE active = true
      AND min_lifetime_spend_minor > ${customer.lifetime_spend_minor ?? 0}
    ORDER BY min_lifetime_spend_minor ASC
    LIMIT 1
  `;

  const orders = await sql`
    SELECT
      id,
      public_id,
      status,
      currency,
      subtotal_minor,
      discount_minor,
      total_minor,
      loyalty_discount_basis_points,
      created_at,
      paid_at,
      fulfilled_at
    FROM orders
    WHERE customer_id = ${customerId}
    ORDER BY created_at DESC
    LIMIT 100
  `;

  const orderIds = orders.map((order) => order.id);
  const items =
    orderIds.length > 0
      ? await sql`
          SELECT
            items.id,
            items.order_id,
            items.quantity,
            items.unit_price_minor,
            denominations.amount_minor AS denomination_minor
          FROM order_items items
          LEFT JOIN gift_card_denominations denominations
            ON denominations.id = items.denomination_id
          WHERE items.order_id IN ${sql(orderIds)}
          ORDER BY items.created_at
        `
      : [];

  return {
    customer: {
      id: customer.id,
      email: customer.email,
      displayName: customer.display_name,
      emailVerified: Boolean(customer.email_verified_at),
    },
    loyalty: {
      tierCode: customer.tier_code ?? "base",
      tierName: customer.tier_name ?? "Базовый",
      lifetimeSpendMinor: Number(customer.lifetime_spend_minor ?? 0),
      discountBasisPoints: Number(
        customer.current_discount_basis_points ?? 0,
      ),
      nextTier: nextTier
        ? {
            code: nextTier.code,
            name: nextTier.name,
            requiredSpendMinor: Number(nextTier.min_lifetime_spend_minor),
            remainingSpendMinor: Math.max(
              0,
              Number(nextTier.min_lifetime_spend_minor) -
                Number(customer.lifetime_spend_minor ?? 0),
            ),
            discountBasisPoints: Number(nextTier.discount_basis_points),
          }
        : null,
    },
    orders: orders.map((order) => ({
      id: order.id,
      publicId: order.public_id,
      status: order.status,
      currency: order.currency,
      subtotalMinor: Number(order.subtotal_minor),
      discountMinor: Number(order.discount_minor),
      totalMinor: Number(order.total_minor),
      loyaltyDiscountBasisPoints: Number(
        order.loyalty_discount_basis_points,
      ),
      createdAt: new Date(order.created_at).toISOString(),
      paidAt: order.paid_at ? new Date(order.paid_at).toISOString() : null,
      fulfilledAt: order.fulfilled_at
        ? new Date(order.fulfilled_at).toISOString()
        : null,
      items: items
        .filter((item) => item.order_id === order.id)
        .map((item) => ({
          id: item.id,
          quantity: Number(item.quantity),
          unitPriceMinor: Number(item.unit_price_minor),
          denominationMinor:
            item.denomination_minor === null
              ? null
              : Number(item.denomination_minor),
        })),
    })),
  };
}

