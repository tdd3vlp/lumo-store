import type { ParsedCategoryProduct, ParsedProductDetail } from "./types";
import type { GQLCategoryPage, GQLPrice, WCAProductData } from "./browser-client";
import { CURRENCY_BY_REGION, GAME_CLASSIFICATIONS } from "./browser-client";
import type { PsnRegion } from "./types";

const NEXT_DATA_RE =
  /<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/;

type ApolloState = Record<string, unknown>;

type NextData = {
  props?: {
    apolloState?: ApolloState;
    pageProps?: {
      apolloState?: ApolloState;
    };
  };
};

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly context?: unknown,
  ) {
    super(message);
    this.name = "ParseError";
  }
}

export const PARSER_VERSION = "1";

function extractNextData(html: string): NextData {
  const match = NEXT_DATA_RE.exec(html);
  if (!match?.[1]) {
    throw new ParseError("__NEXT_DATA__ script tag not found");
  }
  try {
    return JSON.parse(match[1]) as NextData;
  } catch {
    throw new ParseError("Failed to JSON-parse __NEXT_DATA__");
  }
}

function getApolloState(data: NextData): ApolloState {
  // Apollo state moved to props.apolloState in the 2025 CSR migration;
  // fall back to the old props.pageProps.apolloState path for compatibility.
  const state =
    data.props?.apolloState ?? data.props?.pageProps?.apolloState;
  if (!state || typeof state !== "object") {
    throw new ParseError("apolloState missing from __NEXT_DATA__");
  }
  return state;
}

function extractMasterImageUrl(media: unknown): string | null {
  if (!Array.isArray(media)) return null;
  for (const item of media) {
    if (
      item &&
      typeof item === "object" &&
      "role" in item &&
      item.role === "MASTER" &&
      "url" in item &&
      typeof item.url === "string"
    ) {
      return item.url;
    }
  }
  return null;
}

function extractNpTitleId(entry: Record<string, unknown>): string | null {
  const direct = entry.npTitleId;
  if (typeof direct === "string" && direct.length > 0) return direct;

  // Derive from product ID: "PPSA12345_00100000" → "PPSA12345_00"
  const id = typeof entry.id === "string" ? entry.id : null;
  if (id) {
    const m = /^((?:PPSA|CUSA|PPSB|CUSB)\d+)_\d+$/.exec(id);
    if (m) return `${m[1]}_00`;
  }
  return null;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function parseCategory(html: string): ParsedCategoryProduct[] {
  const data = extractNextData(html);
  const apollo = getApolloState(data);

  const products: ParsedCategoryProduct[] = [];

  for (const [key, raw] of Object.entries(apollo)) {
    if (!key.startsWith("SearchProduct:")) continue;
    if (!raw || typeof raw !== "object") continue;
    const entry = raw as Record<string, unknown>;
    if (entry.__typename !== "SearchProduct") continue;

    const id = typeof entry.id === "string" ? entry.id : null;
    const name = typeof entry.name === "string" ? entry.name : null;
    if (!id || !name) continue;

    const price =
      entry.price && typeof entry.price === "object"
        ? (entry.price as Record<string, unknown>)
        : null;

    const basePrice =
      typeof price?.basePriceValue === "number" ? price.basePriceValue : null;
    const discountedPrice =
      typeof price?.discountedValue === "number" ? price.discountedValue : null;

    const priceMinor = discountedPrice ?? basePrice;
    const originalPriceMinor =
      basePrice !== null && basePrice !== priceMinor ? basePrice : null;

    const currencyCode =
      typeof price?.currencyCode === "string" ? price.currencyCode : null;

    const platforms = Array.isArray(entry.platforms)
      ? (entry.platforms as unknown[]).filter(
          (p): p is string => typeof p === "string",
        )
      : [];

    products.push({
      psnProductId: id,
      npTitleId: extractNpTitleId(entry),
      name,
      imageUrl: extractMasterImageUrl(entry.media),
      priceMinor,
      originalPriceMinor,
      currencyCode,
      platforms,
    });
  }

  return products;
}

// ─── GraphQL-based parsers (PS Store CSR migration, 2025) ────────────────────

/**
 * Parse a localized PS Store price string to integer minor units.
 * Handles both Anglo ("₹3,299.00") and European ("₴849,00") decimal formats.
 */
export function parseStringPriceToMinor(price: string | null | undefined): number | null {
  if (!price) return null;
  const clean = price.replace(/[^\d.,]/g, "").trim();
  if (!clean) return null;
  // If string ends with ,\d\d → European decimal comma ("849,00" → 849.00)
  const normalized = /,\d{2}$/.test(clean)
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean.replace(/,/g, "");
  const value = parseFloat(normalized);
  return isNaN(value) ? null : Math.round(value * 100);
}

function gqlPriceToMinors(price: GQLPrice | null): {
  priceMinor: number | null;
  originalPriceMinor: number | null;
} {
  if (!price || price.isFree) return { priceMinor: null, originalPriceMinor: null };
  const current = parseStringPriceToMinor(price.discountedPrice ?? price.basePrice);
  const base = parseStringPriceToMinor(price.basePrice);
  return {
    priceMinor: current,
    originalPriceMinor: base !== current ? base : null,
  };
}

function gqlExtractNpTitleId(id: string, raw: string | null): string | null {
  if (raw && raw.length > 0) return raw;
  const m = /^((?:PPSA|CUSA|PPSB|CUSB)\d+)_\d+$/.exec(id);
  return m ? `${m[1]}_00` : null;
}

function gqlMasterImage(
  media: Array<{ type: string; url: string; role: string }> | undefined,
): string | null {
  return media?.find((m) => m.role === "MASTER")?.url ?? null;
}

/**
 * Parse a categoryGridRetrieve GraphQL response into ParsedCategoryProduct[].
 * `region` is used to set the correct currency code (TRY/UAH).
 */
export function parseCategoryGQL(
  grid: GQLCategoryPage,
  region: PsnRegion,
): ParsedCategoryProduct[] {
  const currencyCode = CURRENCY_BY_REGION[region];
  return (grid.products ?? [])
    .filter((p) => {
      const c = p.storeDisplayClassification;
      return !c || GAME_CLASSIFICATIONS.has(c);
    })
    .map((p) => {
      const { priceMinor, originalPriceMinor } = gqlPriceToMinors(p.price);
      return {
        psnProductId: p.id,
        npTitleId: gqlExtractNpTitleId(p.id, p.npTitleId),
        name: p.name,
        imageUrl: gqlMasterImage(p.media),
        priceMinor,
        originalPriceMinor,
        currencyCode: p.price && !p.price.isFree ? currencyCode : null,
        platforms: p.platforms ?? [],
      };
    });
}

/**
 * Convert WCAProductData (fetched by PsnBrowserClient.fetchProductDetail)
 * into the canonical ParsedProductDetail shape, optionally adding a Russian
 * description obtained from the /ru-ua/ version of the same page.
 */
export function parseProductFromWCA(
  wca: WCAProductData,
  ruWca?: WCAProductData | null,
): ParsedProductDetail {
  const longHtml = wca.longDescriptionHtml;
  const ruHtml = ruWca?.longDescriptionHtml ?? null;

  return {
    psnProductId: wca.id,
    npTitleId: null, // already in DB from category import
    name: wca.name,
    imageUrl: null,  // already in DB from category import
    shortDescription: null,
    longDescriptionHtml: longHtml,
    longDescriptionText: longHtml ? htmlToText(longHtml) : null,
    longDescriptionRuHtml: ruHtml,
    longDescriptionRuText: ruHtml ? htmlToText(ruHtml) : null,
    publisher: wca.publisher,
    releaseDate: wca.releaseDate,
    platforms: wca.platforms,
    genres: wca.genres,
    voiceLanguages: wca.voiceLanguages,
    subtitleLanguages: wca.subtitleLanguages,
    rating: wca.rating,
    ratingsCount: wca.ratingsCount,
    screenshotUrls: wca.screenshotUrls,
    rawJson: wca as unknown as Record<string, unknown>,
  };
}

// ─── Legacy HTML-based parsers (pre-2025 apolloState approach) ────────────────

export function parseProduct(html: string): ParsedProductDetail {
  const data = extractNextData(html);
  const apollo = getApolloState(data);

  let entry: Record<string, unknown> | null = null;

  for (const [key, raw] of Object.entries(apollo)) {
    if (!key.startsWith("Product:")) continue;
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Record<string, unknown>;
    if (candidate.__typename === "Product") {
      entry = candidate;
      break;
    }
  }

  if (!entry) {
    // Surface the actual apolloState shape so the first real dry-run reveals
    // where product data lives. PS Store has historically also stored content
    // under `batarangs[...]` rather than `Product:*` — if that's the case here,
    // this parser needs a dedicated branch for it.
    const prefixes = [
      ...new Set(Object.keys(apollo).map((k) => k.split(":")[0])),
    ].slice(0, 30);
    throw new ParseError(
      `No Product entry found in apolloState. ` +
        `Found ${Object.keys(apollo).length} keys with prefixes: ${prefixes.join(", ")}. ` +
        `If product data lives elsewhere (e.g. batarangs), the parser must be updated.`,
    );
  }

  const id = typeof entry.id === "string" ? entry.id : null;
  if (!id) {
    throw new ParseError("Product entry missing id");
  }

  // Try to get npTitleId from Concept ref
  let npTitleId = extractNpTitleId(entry);
  if (!npTitleId) {
    const ref = entry.concept;
    if (ref && typeof ref === "object" && "__ref" in ref) {
      const conceptKey = (ref as { __ref: string }).__ref;
      const concept = apollo[conceptKey];
      if (concept && typeof concept === "object") {
        const titleIds = (concept as Record<string, unknown>).titleIds;
        if (Array.isArray(titleIds) && typeof titleIds[0] === "string") {
          npTitleId = titleIds[0];
        }
      }
    }
  }

  const longDescHtml =
    typeof entry.longDescription === "string" ? entry.longDescription : null;

  const toStrings = (arr: unknown): string[] =>
    Array.isArray(arr)
      ? (arr as unknown[]).filter((s): s is string => typeof s === "string")
      : [];

  return {
    psnProductId: id,
    npTitleId,
    name: typeof entry.name === "string" ? entry.name : "",
    imageUrl: extractMasterImageUrl(entry.media),
    shortDescription:
      typeof entry.shortDescription === "string"
        ? entry.shortDescription
        : null,
    longDescriptionHtml: longDescHtml,
    longDescriptionText: longDescHtml ? htmlToText(longDescHtml) : null,
    longDescriptionRuHtml: null,
    longDescriptionRuText: null,
    publisher:
      typeof entry.publisherName === "string" ? entry.publisherName : null,
    releaseDate:
      typeof entry.releaseDate === "string" ? entry.releaseDate : null,
    platforms: toStrings(entry.platforms),
    genres: [],
    voiceLanguages: toStrings(entry.voiceLanguages),
    subtitleLanguages: toStrings(entry.subtitleLanguages),
    rating: null,
    ratingsCount: null,
    screenshotUrls: [],
    rawJson: entry,
  };
}
