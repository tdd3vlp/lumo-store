import "server-only";
import { randomBytes } from "node:crypto";
import type { JSONValue } from "postgres";
import { getLoyaltyRates } from "@/lib/account/loyalty";
import {
  type DiscountClass,
  bpsForClass,
  discountedUnitMinor,
  effectiveBps,
} from "@/lib/account/loyalty-discount";
import { sql } from "@/lib/db";
import type { BillItemExtra } from "@/lib/payments/paypalych";
import {
  PS_ACCOUNT_PRICE_MINOR,
  PS_ACCOUNT_REGION_ORDER,
  psAccountRegionLabel,
} from "@/lib/ps-accounts/config";
import { availablePsAccountCounts } from "@/lib/ps-accounts/store";
import { getPublishedProducts } from "@/lib/products/storefront";
import {
  MAX_TOPUPS_PER_ACCOUNT_PER_DAY,
  MAX_USD_PER_ACCOUNT_PER_DAY,
  STEAM_TOPUP_SERVICE_ID,
  type TopUpCurrency,
  formatTopUpAmount,
  isValidSteamLogin,
  isTopUpCurrency,
} from "@/lib/products/steam-topup";
import { quoteSteamTopUp } from "@/lib/products/steam-topup-quote";
import {
  findDenomination,
  formatStars,
  isValidTelegramUsername,
  normalizeTelegramUsername,
} from "@/lib/products/telegram-stars";
import { priceStars } from "@/lib/products/telegram-stars-quote";

// Turns a client cart into a server-authoritative order. Prices are ALWAYS
// re-derived from the published catalog (getPublishedProducts) — the price the
// client sends is display-only and never trusted. The amount PayPalych bills is
// this order's total_minor.

export type CheckoutLine = { denominationId: string; quantity: number };

/** A priced order line, ready to describe to the payment provider's antifraud. */
export type CheckoutItem = {
  name: string;
  /** PayPalych antifraud category (e.g. "digital/giftcard/playstation"). */
  category: string;
  quantity: number;
  unitPriceMinor: number;
  /** Account identifier(s) for antifraud (buyer email, Steam login, TG handle). */
  extra: BillItemExtra;
};

export type CheckoutOrder = {
  id: string;
  publicId: string;
  currency: string;
  totalMinor: number;
  items: CheckoutItem[];
};

/** Map a storefront product type to a PayPalych antifraud category. */
function paypalychCategory(productType: string): string {
  switch (productType) {
    case "steam":
      return "steam";
    case "telegram-stars":
    case "telegram":
      return "digital/stars";
    case "playstation":
    case "xbox":
    case "nintendo":
    case "apple":
      return `digital/giftcard/${productType}`;
    default:
      return "digital/giftcard";
  }
}

export class CheckoutError extends Error {
  constructor(
    message: string,
    public code:
      | "empty_cart"
      | "unknown_item"
      | "unpriced_item"
      | "out_of_stock"
      | "bad_quantity"
      | "limit_exceeded",
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

const MAX_QTY_PER_LINE = 20;
// Sanity caps on a whole cart (not business limits): bound the per-request work
// and keep the order total safely inside the int4 `total_minor` column so a
// crafted cart can't exhaust the DB or overflow the amount.
const MAX_DISTINCT_LINES = 50;
const MAX_ORDER_TOTAL_MINOR = 100_000_000; // 1 000 000 ₽

// Cart SKU prefix for a ready-made PlayStation account (no catalog row).
const PS_ACCOUNT_PREFIX = "ps-account-";

type CreateCheckoutInput = {
  email: string;
  items: CheckoutLine[];
  idempotencyKey: string;
};

/**
 * Validate a cart against the live catalog and persist a pending order.
 * Only catalog denominations (item_type 'gift_card') are accepted; synthetic
 * SKUs (e.g. ps-account-*) are rejected until their own checkout path exists.
 */
export async function createCheckoutOrder(
  input: CreateCheckoutInput,
): Promise<CheckoutOrder> {
  if (input.items.length === 0) {
    throw new CheckoutError("Cart is empty", "empty_cart");
  }

  // Collapse duplicate lines and validate quantities.
  const wanted = new Map<string, number>();
  for (const line of input.items) {
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
      throw new CheckoutError("Quantity must be a positive integer", "bad_quantity");
    }
    wanted.set(
      line.denominationId,
      (wanted.get(line.denominationId) ?? 0) + line.quantity,
    );
  }
  for (const qty of wanted.values()) {
    if (qty > MAX_QTY_PER_LINE) {
      throw new CheckoutError(`At most ${MAX_QTY_PER_LINE} of one item`, "bad_quantity");
    }
  }
  if (wanted.size > MAX_DISTINCT_LINES) {
    throw new CheckoutError(
      `At most ${MAX_DISTINCT_LINES} different items per order`,
      "bad_quantity",
    );
  }

  const hasPsAccounts = [...wanted.keys()].some((id) =>
    id.startsWith(PS_ACCOUNT_PREFIX),
  );
  const [catalogRows, psCounts] = await Promise.all([
    getPublishedProducts(),
    hasPsAccounts
      ? availablePsAccountCounts()
      : Promise.resolve<Record<string, number>>({}),
  ]);
  const catalog = new Map(catalogRows.map((p) => [p.denominationId, p]));
  // Storefront catalog blocks (Apple/Xbox/…) add cart lines by a natural-key
  // slug `${type}-${region}-${amount}` (e.g. "apple-tr-10"), not the DB uuid.
  // Index published products by that slug so those lines resolve to the same
  // denomination (and price) — the sale price is derived from the same NS.gifts
  // USD cost either way, so displayed and charged totals match.
  const bySlug = new Map(
    catalogRows.map((p) => [
      `${p.productType}-${p.region.toLowerCase()}-${p.amountMajor}`,
      p,
    ]),
  );

  type Resolved = {
    itemType: "gift_card" | "ps_account";
    // Catalog denomination uuid, or null for a synthetic SKU (ps-account).
    denominationId: string | null;
    name: string;
    category: string;
    quantity: number;
    unitPriceMinor: number;
    metadata: JSONValue | null;
  };
  const resolved: Resolved[] = [];
  let subtotalMinor = 0;
  const currency = "RUB";

  for (const [denominationId, quantity] of wanted) {
    // Ready-made PlayStation account: fixed server-side price, soft stock check.
    if (denominationId.startsWith(PS_ACCOUNT_PREFIX)) {
      const region = denominationId.slice(PS_ACCOUNT_PREFIX.length).toUpperCase();
      if (!PS_ACCOUNT_REGION_ORDER.includes(region)) {
        throw new CheckoutError(
          `Unknown account region: ${denominationId}`,
          "unknown_item",
        );
      }
      const label = psAccountRegionLabel(region);
      if ((psCounts[region] ?? 0) < quantity) {
        throw new CheckoutError(
          `Аккаунтов PlayStation (${label}) не хватает в наличии.`,
          "out_of_stock",
        );
      }
      resolved.push({
        itemType: "ps_account",
        denominationId: null,
        name: `Аккаунт PlayStation (${label})`,
        category: "digital/account/playstation",
        quantity,
        unitPriceMinor: PS_ACCOUNT_PRICE_MINOR,
        metadata: { kind: "ps_account", region },
      });
      subtotalMinor += PS_ACCOUNT_PRICE_MINOR * quantity;
      continue;
    }

    // Resolve by DB uuid first, then by storefront slug.
    const product = catalog.get(denominationId) ?? bySlug.get(denominationId);
    if (!product) {
      throw new CheckoutError(
        `Item is no longer available: ${denominationId}`,
        "unknown_item",
      );
    }
    if (product.salePriceMinor === null) {
      throw new CheckoutError(
        `Item has no price yet: ${product.displayName}`,
        "unpriced_item",
      );
    }
    resolved.push({
      itemType: "gift_card",
      // Always the DB uuid — the downstream fulfilment/ЛК model keys on it.
      denominationId: product.denominationId,
      name: product.displayName,
      category: paypalychCategory(product.productType),
      quantity,
      unitPriceMinor: product.salePriceMinor,
      metadata: null,
    });
    subtotalMinor += product.salePriceMinor * quantity;
  }

  if (subtotalMinor > MAX_ORDER_TOTAL_MINOR) {
    throw new CheckoutError("Сумма заказа слишком большая.", "bad_quantity");
  }

  const publicId = `LS-${randomBytes(6).toString("hex").toUpperCase()}`;

  return sql.begin(async (tx) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const [customer] = await tx`
      INSERT INTO customers (email)
      VALUES (${normalizedEmail})
      ON CONFLICT (email) DO UPDATE SET updated_at = now()
      RETURNING id
    `;

    // Loyalty discount. Cart lines are all "card"-class (gift cards + ready-made
    // accounts), so the whole cart takes the tier's card rate. The discount is
    // applied at the unit price and rounded to whole rubles, so the line items
    // sum exactly to the charged total (which the payment provider bills).
    const rates = await getLoyaltyRates(tx, String(customer.id));
    const cardBps = bpsForClass(rates, "card");
    const priced = resolved.map((line) => ({
      ...line,
      chargedUnitMinor: discountedUnitMinor(line.unitPriceMinor, cardBps),
    }));
    const totalMinor = priced.reduce(
      (sum, line) => sum + line.chargedUnitMinor * line.quantity,
      0,
    );
    const discountMinor = subtotalMinor - totalMinor;
    const loyaltyBps = effectiveBps(subtotalMinor, discountMinor);

    const [order] = await tx`
      INSERT INTO orders (
        public_id, customer_id, status, currency,
        subtotal_minor, discount_minor, total_minor,
        loyalty_discount_basis_points, loyalty_tier_code, idempotency_key
      )
      VALUES (
        ${publicId}, ${customer.id}, 'pending', ${currency},
        ${subtotalMinor}, ${discountMinor}, ${totalMinor},
        ${loyaltyBps}, ${rates.tierCode}, ${input.idempotencyKey}
      )
      ON CONFLICT (customer_id, idempotency_key) DO UPDATE SET
        idempotency_key = EXCLUDED.idempotency_key
      RETURNING id, public_id, currency, total_minor
    `;

    // Idempotent replay: items already written under this key — return as-is.
    const existing = await tx`
      SELECT 1 FROM order_items WHERE order_id = ${order.id} LIMIT 1
    `;
    if (existing.length === 0) {
      for (const line of resolved) {
        await tx`
          INSERT INTO order_items (
            order_id, item_type, denomination_id, quantity, unit_price_minor,
            title, metadata
          )
          VALUES (
            ${order.id}, ${line.itemType}, ${line.denominationId},
            ${line.quantity}, ${line.unitPriceMinor},
            ${line.itemType === "gift_card" ? null : line.name},
            ${line.metadata === null ? null : sql.json(line.metadata)}
          )
        `;
      }
    }

    return {
      id: String(order.id),
      publicId: String(order.public_id),
      currency: String(order.currency),
      totalMinor: Number(order.total_minor),
      items: priced.map((line) => ({
        name: line.name,
        category: line.category,
        quantity: line.quantity,
        // Discounted unit price, so the provider's line items sum to the charge.
        unitPriceMinor: line.chargedUnitMinor,
        // The gift-card code is delivered to the buyer's email.
        extra: { account: normalizedEmail },
      })),
    };
  });
}

const MAX_SINGLE_ITEM_MINOR = 100_000_00; // 100 000 ₽ sanity cap per top-up.

/**
 * Per-account daily limits: at most MAX_TOPUPS_PER_ACCOUNT_PER_DAY successful
 * top-ups of one Steam account per rolling 24h, and at most
 * MAX_USD_PER_ACCOUNT_PER_DAY dollars in total. Counts only orders the buyer
 * actually paid — abandoned pending orders don't burn the limit.
 */
async function assertSteamDailyLimit(login: string, amountUsd: number): Promise<void> {
  const [usage] = await sql`
    SELECT
      count(*)::int AS cnt,
      coalesce(sum((oi.metadata ->> 'amount_usd')::numeric), 0)::float AS usd
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.item_type = 'steam_topup'
      AND lower(oi.metadata ->> 'steam_account') = lower(${login})
      AND o.status IN ('paid', 'fulfilling', 'fulfilled', 'manual_review')
      AND o.paid_at > now() - interval '24 hours'
  `;
  if (Number(usage.cnt) >= MAX_TOPUPS_PER_ACCOUNT_PER_DAY) {
    throw new CheckoutError(
      `Один аккаунт можно пополнять не более ${MAX_TOPUPS_PER_ACCOUNT_PER_DAY} раз в сутки. Попробуйте позже.`,
      "limit_exceeded",
    );
  }
  if (Number(usage.usd) + amountUsd > MAX_USD_PER_ACCOUNT_PER_DAY) {
    throw new CheckoutError(
      `Лимит пополнений одного аккаунта — $${MAX_USD_PER_ACCOUNT_PER_DAY} в сутки. Попробуйте позже.`,
      "limit_exceeded",
    );
  }
}

/**
 * Price a Steam top-up server-side (re-checking the account live) and persist a
 * pending order. Never trusts a client-sent price. The Steam login is stored in
 * the order item's metadata and sent to PayPalych as extra.steam_account.
 */
export async function createSteamTopUpOrder(input: {
  email: string;
  login: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
}): Promise<CheckoutOrder> {
  const login = input.login.trim();
  if (!isValidSteamLogin(login)) {
    throw new CheckoutError("Некорректный логин Steam.", "unknown_item");
  }
  if (!isTopUpCurrency(input.currency)) {
    throw new CheckoutError("Неизвестная валюта пополнения.", "unknown_item");
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new CheckoutError("Некорректная сумма.", "bad_quantity");
  }

  const currency = input.currency as TopUpCurrency;
  // quote re-validates the account exists AND prices off the official FX rate.
  const quote = await quoteSteamTopUp({ login, amount: input.amount, currency });
  if (!quote.canRefill || quote.priceMinor === null) {
    throw new CheckoutError(
      quote.error ?? "Не удалось оформить пополнение Steam.",
      "unpriced_item",
    );
  }
  const priceMinor = quote.priceMinor;
  if (priceMinor > MAX_SINGLE_ITEM_MINOR) {
    throw new CheckoutError("Сумма слишком большая.", "bad_quantity");
  }
  await assertSteamDailyLimit(login, quote.amountUsd ?? 0);

  const title = `Пополнение Steam ${formatTopUpAmount(input.amount, currency)}`;
  const metadata = {
    kind: "steam_topup",
    steam_account: login,
    amount: input.amount,
    currency,
    amount_usd: quote.amountUsd,
    ns_service_id: STEAM_TOPUP_SERVICE_ID,
  };

  const order = await persistTopUpOrder({
    email: input.email,
    idempotencyKey: input.idempotencyKey,
    itemType: "steam_topup",
    discountClass: "topup",
    title,
    priceMinor,
    metadata,
  });

  return {
    ...order,
    items: [
      {
        name: title,
        category: "steam",
        quantity: 1,
        // Loyalty-discounted charge (order.totalMinor); the sticker price lives
        // in the order item's unit_price_minor.
        unitPriceMinor: order.totalMinor,
        extra: { steam_account: login },
      },
    ],
  };
}

/**
 * Price a Telegram Stars package server-side and persist a pending order. The
 * recipient username is stored in metadata and sent to PayPalych as
 * extra.telegram_username.
 */
export async function createTelegramStarsOrder(input: {
  email: string;
  username: string;
  stars: number;
  idempotencyKey: string;
}): Promise<CheckoutOrder> {
  const username = normalizeTelegramUsername(input.username);
  if (!isValidTelegramUsername(username)) {
    throw new CheckoutError("Некорректный username Telegram.", "unknown_item");
  }
  const denomination = findDenomination(input.stars);
  if (!denomination) {
    throw new CheckoutError("Такого пакета звёзд нет.", "unknown_item");
  }
  const priceMinor = await priceStars(input.stars);
  if (priceMinor === null) {
    throw new CheckoutError("Не удалось рассчитать цену.", "unpriced_item");
  }

  const title = `Telegram Stars — ${formatStars(input.stars)} ⭐`;
  const metadata = {
    kind: "telegram_stars",
    telegram_username: username,
    stars: input.stars,
    ns_service_id: denomination.serviceId,
  };

  const order = await persistTopUpOrder({
    email: input.email,
    idempotencyKey: input.idempotencyKey,
    itemType: "telegram_stars",
    discountClass: "topup",
    title,
    priceMinor,
    metadata,
  });

  return {
    ...order,
    items: [
      {
        name: title,
        category: "digital/stars",
        quantity: 1,
        // Loyalty-discounted charge (order.totalMinor); the sticker price lives
        // in the order item's unit_price_minor.
        unitPriceMinor: order.totalMinor,
        extra: { telegram_username: username },
      },
    ],
  };
}

/**
 * Shared single-line order writer for wallet top-ups (Steam / Telegram).
 * Applies the customer's loyalty discount for the given class; `priceMinor` is
 * the sticker price (stored on the order item), and the discounted amount
 * becomes the order total the payment provider bills.
 */
async function persistTopUpOrder(input: {
  email: string;
  idempotencyKey: string;
  itemType: "steam_topup" | "telegram_stars";
  discountClass: DiscountClass;
  title: string;
  priceMinor: number;
  metadata: JSONValue;
}): Promise<Omit<CheckoutOrder, "items">> {
  const publicId = `LS-${randomBytes(6).toString("hex").toUpperCase()}`;
  const currency = "RUB";

  return sql.begin(async (tx) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const [customer] = await tx`
      INSERT INTO customers (email)
      VALUES (${normalizedEmail})
      ON CONFLICT (email) DO UPDATE SET updated_at = now()
      RETURNING id
    `;

    const rates = await getLoyaltyRates(tx, String(customer.id));
    const bps = bpsForClass(rates, input.discountClass);
    const totalMinor = discountedUnitMinor(input.priceMinor, bps);
    const discountMinor = input.priceMinor - totalMinor;

    const [order] = await tx`
      INSERT INTO orders (
        public_id, customer_id, status, currency,
        subtotal_minor, discount_minor, total_minor,
        loyalty_discount_basis_points, loyalty_tier_code, idempotency_key
      )
      VALUES (
        ${publicId}, ${customer.id}, 'pending', ${currency},
        ${input.priceMinor}, ${discountMinor}, ${totalMinor},
        ${bps}, ${rates.tierCode}, ${input.idempotencyKey}
      )
      ON CONFLICT (customer_id, idempotency_key) DO UPDATE SET
        idempotency_key = EXCLUDED.idempotency_key
      RETURNING id, public_id, currency, total_minor
    `;

    const existing = await tx`
      SELECT 1 FROM order_items WHERE order_id = ${order.id} LIMIT 1
    `;
    if (existing.length === 0) {
      await tx`
        INSERT INTO order_items (
          order_id, item_type, quantity, unit_price_minor, title, metadata
        )
        VALUES (
          ${order.id}, ${input.itemType}, 1, ${input.priceMinor},
          ${input.title}, ${sql.json(input.metadata)}
        )
      `;
    }

    return {
      id: String(order.id),
      publicId: String(order.public_id),
      currency: String(order.currency),
      totalMinor: Number(order.total_minor),
    };
  });
}
