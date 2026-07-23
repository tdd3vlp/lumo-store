import { sql } from "@/lib/db";
import { decryptPsAccount } from "@/lib/ps-accounts/crypto";

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
    /** Gift-card / account discount, in basis points (100 = 1%). */
    discountBasisPoints: number;
    /** Wallet top-up discount, in basis points. */
    topupDiscountBasisPoints: number;
    nextTier: {
      code: string;
      name: string;
      requiredSpendMinor: number;
      remainingSpendMinor: number;
      discountBasisPoints: number;
      topupDiscountBasisPoints: number;
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
      title: string | null;
      /** Storefront product type (apple/xbox/…) → maps to the activation guide. */
      productType: string | null;
      /**
       * How many gift-card codes are delivered for this line. The codes
       * themselves are NOT loaded here — they are decrypted on demand behind the
       * authenticated reveal endpoint (POST /api/account/orders/reveal), so the
       * plaintext never enters the initial page HTML/JSON. 0 until fulfilled.
       */
      giftCardCodeCount: number;
      /**
       * Delivered PlayStation-account credentials for this line (decrypted),
       * shown directly in the ЛК. Empty for non-account lines / until fulfilled.
       */
      psAccountLines: string[];
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
      accounts.current_topup_discount_basis_points,
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
    SELECT
      code, name, min_lifetime_spend_minor,
      discount_basis_points, topup_discount_basis_points
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
            items.title,
            denominations.amount_minor AS denomination_minor,
            denominations.product_type
          FROM order_items items
          LEFT JOIN gift_card_denominations denominations
            ON denominations.id = items.denomination_id
          WHERE items.order_id IN ${sql(orderIds)}
          ORDER BY items.created_at
        `
      : [];

  // Gift-card codes are NOT decrypted here. We only count how many are delivered
  // per line so the page can show the "Получить код" button; the plaintext is
  // revealed on demand behind the authenticated, journalled reveal endpoint —
  // so it never enters the initial HTML/JSON.
  const itemIds = items.map((item) => item.id);
  const countRows =
    itemIds.length > 0
      ? await sql`
          SELECT order_item_id, COUNT(*)::int AS count
          FROM fulfillment_deliveries
          WHERE order_item_id IN ${sql(itemIds)}
          GROUP BY order_item_id
        `
      : [];
  const countByItem = new Map<string, number>();
  for (const row of countRows) {
    countByItem.set(String(row.order_item_id), Number(row.count));
  }
  const psLinesByItem = new Map<string, string[]>();

  // Delivered PlayStation-account credentials for these items — decrypted here
  // and shown directly in the account (these are NOT gated behind the reveal
  // flow). Each field is its own line for readability. The ЛК (behind auth) is
  // the delivery of record for accounts; they are never emailed.
  const psRows =
    itemIds.length > 0
      ? await sql`
          SELECT
            reserved_order_item_id,
            data_ciphertext,
            data_iv,
            data_auth_tag
          FROM ps_accounts
          WHERE status = 'delivered'
            AND reserved_order_item_id IN ${sql(itemIds)}
          ORDER BY delivered_at
        `
      : [];
  for (const row of psRows) {
    const fields = decryptPsAccount({
      ciphertext: row.data_ciphertext,
      iv: row.data_iv,
      authTag: row.data_auth_tag,
    });
    const lines = [
      `Почта: ${fields.email}`,
      `Пароль: ${fields.password}`,
      ...(fields.totp ? [`Коды 2FA: ${fields.totp}`] : []),
      ...(fields.birthdate ? [`Дата рождения: ${fields.birthdate}`] : []),
    ];
    const key = String(row.reserved_order_item_id);
    const list = psLinesByItem.get(key) ?? [];
    list.push(...lines);
    psLinesByItem.set(key, list);
  }

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
      topupDiscountBasisPoints: Number(
        customer.current_topup_discount_basis_points ?? 0,
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
            topupDiscountBasisPoints: Number(
              nextTier.topup_discount_basis_points,
            ),
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
          title: item.title === null ? null : String(item.title),
          productType:
            item.product_type === null ? null : String(item.product_type),
          giftCardCodeCount: countByItem.get(String(item.id)) ?? 0,
          psAccountLines: psLinesByItem.get(String(item.id)) ?? [],
        })),
    })),
  };
}

