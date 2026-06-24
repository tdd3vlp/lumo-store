# Lumo Signal data platform

## Components

- PostgreSQL stores catalog history, orders, payments and gift-card inventory.
- Weekly CSV files are immutable inputs. Importing the same file checksum twice
  is a no-op.
- Products are deduplicated by the Indian PSN product ID (`Артикул`).
- Gift-card codes are encrypted with AES-256-GCM and never placed in orders,
  payment records, logs or email-outbox payloads.

## Local setup

```bash
cp .env.example .env.local
npm run db:up
npm run db:migrate
```

Generate the gift-card encryption key:

```bash
openssl rand -base64 32
```

Store the result as `GIFT_CARD_ENCRYPTION_KEY` in the deployment secret store.
Changing this key makes existing inventory impossible to decrypt.

## Weekly catalog workflow

CSV files may be passed individually or as directories:

```bash
npm run catalog:import -- data/imports/2026-06-22
```

The importer:

1. Detects UTF-8 or Windows-1251.
2. Parses semicolon-separated multiline CSV safely.
3. Deduplicates products by Indian PSN ID.
4. Preserves every collection/offer and raw source row.

## Gift-card inventory

Inventory CSV format:

```csv
region,currency,denomination,code,supplier_reference,cost
IN,INR,1000,AAAA-BBBB-CCCC,supplier-batch-42,930
```

Import:

```bash
npm run gift-cards:import -- private/inventory.csv
```

Never commit inventory files. After a successful import, move or securely
delete the source file.

## Payment and delivery flow

1. `createGiftCardOrder` creates an idempotent pending order.
2. A provider-specific webhook validates its signature.
3. Only after validation, the adapter calls
   `confirmPaymentAndQueueFulfillment`.
4. The transaction verifies amount/currency and reserves inventory with
   `FOR UPDATE SKIP LOCKED`.
5. It creates fulfillment rows and one idempotent email-outbox event.
6. An email worker decrypts codes only immediately before sending.
7. After the provider confirms the send, cards and order become fulfilled.

Payment and email providers are intentionally adapters. Their credentials and
webhook verification must be added after providers are selected.
The email provider adapter must use `eventKey` as its idempotency key.

## Personal account and loyalty

Authentication is provider-neutral. An auth adapter verifies the session and
maps its stable `(provider, providerSubject)` pair to `auth_identities`.
Never accept `customerId` directly from a browser request.

The personal account is backed by:

- `customer_profiles` for user-editable profile data;
- `auth_identities` for one or more login providers;
- `orders` and `order_items` for order history;
- `loyalty_accounts` for the current balance and discount snapshot;
- `loyalty_ledger` for immutable accrual/refund history;
- `loyalty_tiers` for configurable cumulative discount thresholds.

Only the base tier is seeded by default. Add business tiers explicitly, for
example:

```sql
INSERT INTO loyalty_tiers (
  code,
  name,
  min_lifetime_spend_minor,
  discount_basis_points,
  sort_order
)
VALUES
  ('silver', 'Серебряный', 1000000, 200, 10),
  ('gold', 'Золотой', 2500000, 300, 20),
  ('platinum', 'Платиновый', 5000000, 500, 30);
```

Amounts are minor currency units and discounts are basis points:
`200 = 2%`, `500 = 5%`.

Order creation stores a snapshot of the tier and discount. A later tier change
does not alter historical orders. Loyalty spend is credited only after the
gift-card email is confirmed as delivered, and the ledger's unique constraint
prevents duplicate credit from repeated webhooks or worker retries.

Account UI/API should use `getAccountOverview` and `updateCustomerProfile`
after the selected auth provider resolves the current customer.

## Operational rules

- Back up PostgreSQL and the encryption key separately.
- Do not log raw card codes, payment payload secrets or decrypted email data.
- Alert on failed outbox events and low available inventory by denomination.
- Verify webhook signatures before any order state transition.
