import "server-only";
import { sql } from "@/lib/db";
import { encryptGiftCardCode } from "@/lib/gift-cards/crypto";

export type CuratedDenomination = {
  denominationId: string;
  productType: string;
  region: string;
  currency: string;
  amountMajor: number;
  displayName: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  active: boolean;
  nsGiftsServiceId: number | null;
  purchaseCostMinor: number | null;
  salePriceMinor: number | null;
  availableCount: number;
};

const PRODUCT_TYPE_PATTERN = /^[a-z]+$/;

/**
 * Every denomination with its curation state, resolved retail price (via the
 * gift_card_retail_prices view), and available-inventory count — powers the
 * admin catalog screen. LEFT JOINs so denominations without a pricing policy or
 * inventory still appear (flagged as needing attention rather than hidden).
 */
export async function listCuratedDenominations(): Promise<CuratedDenomination[]> {
  const rows = await sql`
    SELECT
      d.id,
      d.product_type,
      d.region,
      d.currency,
      d.amount_minor,
      d.display_name,
      d.image_url,
      d.is_published,
      d.active,
      d.ns_gifts_service_id,
      retail.purchase_cost_minor,
      retail.sale_price_minor,
      COUNT(cards.id) FILTER (WHERE cards.status = 'available') AS available_count
    FROM gift_card_denominations d
    LEFT JOIN gift_card_retail_prices retail ON retail.id = d.id
    LEFT JOIN gift_card_inventory cards ON cards.denomination_id = d.id
    GROUP BY
      d.id, d.product_type, d.region, d.currency, d.amount_minor,
      d.display_name, d.image_url, d.is_published, d.active,
      d.ns_gifts_service_id, retail.purchase_cost_minor, retail.sale_price_minor
    ORDER BY d.product_type, d.region, d.amount_minor
  `;

  return rows.map((row) => ({
    denominationId: String(row.id),
    productType: String(row.product_type),
    region: String(row.region),
    currency: String(row.currency),
    amountMajor: Number(row.amount_minor) / 100,
    displayName: row.display_name === null ? null : String(row.display_name),
    imageUrl: row.image_url === null ? null : String(row.image_url),
    isPublished: Boolean(row.is_published),
    active: Boolean(row.active),
    nsGiftsServiceId:
      row.ns_gifts_service_id === null ? null : Number(row.ns_gifts_service_id),
    purchaseCostMinor:
      row.purchase_cost_minor === null ? null : Number(row.purchase_cost_minor),
    salePriceMinor:
      row.sale_price_minor === null ? null : Number(row.sale_price_minor),
    availableCount: Number(row.available_count),
  }));
}

export type CurateInput = {
  productType: string;
  region: string;
  currency: string;
  amountMajor: number;
  displayName: string;
  imageUrl?: string | null;
  isPublished: boolean;
  nsGiftsServiceId?: number | null;
  /** Retail price the customer pays, in ruble minor units (kopecks). */
  salePriceOverrideMinor?: number | null;
  /** Wholesale cost from NS.gifts, in ruble minor units — informational (margin). */
  purchaseCostMinor?: number | null;
};

/**
 * Creates or updates a curated storefront product on the shared
 * gift_card_denominations table. Self-contained: guarantees a pricing policy
 * exists for the region (so the retail view can resolve a price) and, when a
 * retail override is supplied, writes it to gift_card_procurement_prices. The
 * natural key (region, currency, amount, product_type) makes this idempotent.
 */
export async function curateDenomination(
  input: CurateInput,
): Promise<{ denominationId: string }> {
  const productType = input.productType.trim().toLowerCase();
  if (!PRODUCT_TYPE_PATTERN.test(productType)) {
    throw new Error("productType must be lowercase letters only (e.g. steam, playstation)");
  }
  const region = input.region.trim();
  const currency = input.currency.trim().toUpperCase();
  if (!region) throw new Error("region is required");
  if (currency.length !== 3) throw new Error("currency must be a 3-letter code");
  if (!Number.isFinite(input.amountMajor) || input.amountMajor <= 0) {
    throw new Error("amountMajor must be a positive number");
  }
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("displayName is required");

  return sql.begin(async (tx) => {
    // A retail-view row only exists when the region has a pricing policy
    // (the view INNER JOINs policies) — ensure one so the product can resolve
    // a price instead of vanishing from the storefront.
    await tx`
      INSERT INTO gift_card_region_pricing_policies
        (region, sale_currency, markup_basis_points, rounding_increment_minor)
      VALUES (${region}, 'RUB', 0, 100)
      ON CONFLICT (region) DO NOTHING
    `;

    const [denomination] = await tx`
      INSERT INTO gift_card_denominations
        (region, currency, amount_minor, product_type, display_name, image_url,
         is_published, ns_gifts_service_id, active)
      VALUES (
        ${region}, ${currency}, ${Math.round(input.amountMajor * 100)}, ${productType},
        ${displayName}, ${input.imageUrl ?? null}, ${input.isPublished},
        ${input.nsGiftsServiceId ?? null}, true
      )
      ON CONFLICT (region, currency, amount_minor, product_type) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        image_url = EXCLUDED.image_url,
        is_published = EXCLUDED.is_published,
        ns_gifts_service_id = COALESCE(EXCLUDED.ns_gifts_service_id, gift_card_denominations.ns_gifts_service_id),
        active = true
      RETURNING id
    `;
    const denominationId = String(denomination.id);

    if (
      input.salePriceOverrideMinor != null ||
      input.purchaseCostMinor != null
    ) {
      await tx`
        INSERT INTO gift_card_procurement_prices
          (denomination_id, purchase_cost_minor, sale_price_override_minor)
        VALUES (
          ${denominationId},
          ${input.purchaseCostMinor ?? null},
          ${input.salePriceOverrideMinor ?? null}
        )
        ON CONFLICT (denomination_id) DO UPDATE SET
          purchase_cost_minor = COALESCE(EXCLUDED.purchase_cost_minor, gift_card_procurement_prices.purchase_cost_minor),
          sale_price_override_minor = COALESCE(EXCLUDED.sale_price_override_minor, gift_card_procurement_prices.sale_price_override_minor),
          updated_at = now()
      `;
    }

    return { denominationId };
  });
}

/** Remembers which NS.gifts catalog service a denomination was last restocked from. */
export async function setNsGiftsServiceId(
  denominationId: string,
  serviceId: number,
): Promise<void> {
  await sql`
    UPDATE gift_card_denominations
    SET ns_gifts_service_id = ${serviceId}
    WHERE id = ${denominationId}
  `;
}

/** Encrypts and adds one or more codes to a denomination's inventory pool. */
export async function addInventoryCodes(input: {
  denominationId: string;
  codes: string[];
  supplierReference?: string;
}): Promise<{ inserted: number; total: number }> {
  const codes = input.codes.map((c) => c.trim()).filter(Boolean);
  if (codes.length === 0) throw new Error("At least one code is required");

  const [denomination] = await sql`
    SELECT id FROM gift_card_denominations WHERE id = ${input.denominationId}
  `;
  if (!denomination) throw new Error("Unknown denomination");

  let inserted = 0;
  for (const code of codes) {
    const encrypted = encryptGiftCardCode(code);
    const result = await sql`
      INSERT INTO gift_card_inventory (
        denomination_id, code_ciphertext, code_iv, code_auth_tag,
        code_fingerprint, supplier_reference
      )
      VALUES (
        ${input.denominationId}, ${encrypted.ciphertext}, ${encrypted.iv},
        ${encrypted.authTag}, ${encrypted.fingerprint},
        ${input.supplierReference ?? "admin-ui"}
      )
      ON CONFLICT (code_fingerprint) DO NOTHING
      RETURNING id
    `;
    if (result.length > 0) inserted += 1;
  }

  return { inserted, total: codes.length };
}
