import type { TransactionSql } from "postgres";
import {
  type LoyaltyRates,
  NO_LOYALTY_DISCOUNT,
} from "@/lib/account/loyalty-discount";
import { sql } from "@/lib/db";

export async function ensureLoyaltyAccount(
  transaction: TransactionSql,
  customerId: string,
) {
  const [account] = await transaction`
    INSERT INTO loyalty_accounts (
      customer_id,
      tier_id,
      current_discount_basis_points,
      current_topup_discount_basis_points
    )
    SELECT ${customerId}, id, discount_basis_points, topup_discount_basis_points
    FROM loyalty_tiers
    WHERE active = true
    ORDER BY min_lifetime_spend_minor ASC
    LIMIT 1
    ON CONFLICT (customer_id) DO UPDATE SET
      updated_at = loyalty_accounts.updated_at
    RETURNING
      customer_id,
      tier_id,
      lifetime_spend_minor,
      current_discount_basis_points,
      current_topup_discount_basis_points
  `;

  if (!account) throw new Error("No active loyalty tier is configured");
  return account;
}

/**
 * The customer's current discount rates (card + top-up) and tier code, ensuring
 * a base-tier account exists first. Called inside the checkout transaction so
 * the price a buyer is charged reflects the tier they hold at order time.
 */
export async function getLoyaltyRates(
  transaction: TransactionSql,
  customerId: string,
): Promise<LoyaltyRates> {
  await ensureLoyaltyAccount(transaction, customerId);
  const [row] = await transaction`
    SELECT
      tiers.code AS tier_code,
      accounts.current_discount_basis_points AS card_bps,
      accounts.current_topup_discount_basis_points AS topup_bps
    FROM loyalty_accounts accounts
    JOIN loyalty_tiers tiers ON tiers.id = accounts.tier_id
    WHERE accounts.customer_id = ${customerId}
  `;
  return {
    tierCode: String(row.tier_code),
    cardBps: Number(row.card_bps),
    topupBps: Number(row.topup_bps),
  };
}

/**
 * Read-only current discount rates for a customer, for DISPLAY only (cart /
 * checkout totals). Never mutates and never throws — a missing account or an
 * unreachable DB degrades to the base (no-discount) rates, so a display path
 * can't break checkout. The charged amount is always recomputed authoritatively
 * at order creation, so a briefly stale display never over- or under-charges.
 */
export async function getCustomerDiscountRates(
  customerId: string,
): Promise<LoyaltyRates> {
  try {
    const [row] = await sql`
      SELECT
        tiers.code AS tier_code,
        accounts.current_discount_basis_points AS card_bps,
        accounts.current_topup_discount_basis_points AS topup_bps
      FROM loyalty_accounts accounts
      JOIN loyalty_tiers tiers ON tiers.id = accounts.tier_id
      WHERE accounts.customer_id = ${customerId}
    `;
    if (!row) return NO_LOYALTY_DISCOUNT;
    return {
      tierCode: String(row.tier_code),
      cardBps: Number(row.card_bps),
      topupBps: Number(row.topup_bps),
    };
  } catch {
    return NO_LOYALTY_DISCOUNT;
  }
}

export async function creditFulfilledOrder(
  transaction: TransactionSql,
  input: {
    orderId: string;
    customerId: string;
    eligibleSpendMinor: number;
  },
) {
  const [existing] = await transaction`
    SELECT id
    FROM loyalty_ledger
    WHERE order_id = ${input.orderId}
      AND event_type = 'order_fulfilled'
  `;
  if (existing) return;

  await ensureLoyaltyAccount(transaction, input.customerId);

  const [account] = await transaction`
    SELECT lifetime_spend_minor
    FROM loyalty_accounts
    WHERE customer_id = ${input.customerId}
    FOR UPDATE
  `;

  const balanceAfter =
    Number(account.lifetime_spend_minor) + input.eligibleSpendMinor;
  const [tier] = await transaction`
    SELECT id, code, discount_basis_points, topup_discount_basis_points
    FROM loyalty_tiers
    WHERE active = true
      AND min_lifetime_spend_minor <= ${balanceAfter}
    ORDER BY min_lifetime_spend_minor DESC, sort_order DESC
    LIMIT 1
  `;

  if (!tier) throw new Error("No loyalty tier matches the account balance");

  await transaction`
    UPDATE loyalty_accounts
    SET
      tier_id = ${tier.id},
      lifetime_spend_minor = ${balanceAfter},
      current_discount_basis_points = ${tier.discount_basis_points},
      current_topup_discount_basis_points = ${tier.topup_discount_basis_points},
      updated_at = now()
    WHERE customer_id = ${input.customerId}
  `;

  await transaction`
    INSERT INTO loyalty_ledger (
      customer_id,
      order_id,
      event_type,
      spend_delta_minor,
      balance_after_minor
    )
    VALUES (
      ${input.customerId},
      ${input.orderId},
      'order_fulfilled',
      ${input.eligibleSpendMinor},
      ${balanceAfter}
    )
  `;
}
