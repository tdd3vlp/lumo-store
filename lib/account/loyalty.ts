import type { TransactionSql } from "postgres";

export async function ensureLoyaltyAccount(
  transaction: TransactionSql,
  customerId: string,
) {
  const [account] = await transaction`
    INSERT INTO loyalty_accounts (
      customer_id,
      tier_id,
      current_discount_basis_points
    )
    SELECT ${customerId}, id, discount_basis_points
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
      current_discount_basis_points
  `;

  if (!account) throw new Error("No active loyalty tier is configured");
  return account;
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
    SELECT id, code, discount_basis_points
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
