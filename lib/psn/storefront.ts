import "server-only";
import { unstable_cache } from "next/cache";
import { createDatabaseClient } from "@/lib/database";
import type { Game } from "@/data/mockGames";
import type { PsnRegion } from "./types";
import { WELL_KNOWN_COLLECTIONS, LOCALE_BY_REGION } from "./types";
import { FEATURED_PROMOS } from "@/lib/featured-promo";
import { cleanGameTitle, inferEditionName } from "@/lib/catalog/editions";

const sql = createDatabaseClient(3);

// The storefront is read-only and the catalog only changes on the import cadence
// (dry-run → commit), so serving it from the Data Cache for a few minutes avoids
// re-scanning the region on every request while the page stays `force-dynamic`.
// `revalidateTag(STOREFRONT_CACHE_TAG)` from a route handler can force a refresh.
const STOREFRONT_CACHE_TTL = 300; // seconds
const STOREFRONT_CACHE_TAG = "psn-storefront";

type ProductRow = {
  psn_product_id: string;
  np_title_id: string | null;
  title: string;
  image_url: string | null;
  platforms: string[];
  store_url: string;
  price_minor: number | null;
  original_price_minor: number | null;
  voice_languages: string[];
  subtitle_languages: string[];
  rating: string | null;
  ratings_count: number | null;
  release_date: string | null;
  genres: string[];
  publisher: string | null;
  description_ru_text: string | null;
  description_ai_ru_text: string | null;
  description_ai_summary_ru: string | null;
  description_ai_full_ru: string | null;
  description_original_text: string | null;
  sales_rank: number | null;
  sale_end_date: string | null;
  screenshot_urls: string[];
};

// Maps a PS Store product id to the numeric id used in /game/<id> URLs, the
// cart, and favorites. getPsnGameById reverse-maps this number back to a product
// by re-hashing every row, so a collision would resolve the URL to the WRONG
// game. Two independent 32-bit rolling hashes are combined into a ~44-bit value,
// dropping the collision probability to ≈N²/2^45 (negligible even for tens of
// thousands of products) versus the old single 32-bit hash (~0.5% at N=5000).
// Constraints: kept ≥ 10000 to clear the static mock-catalog ids (max ~2050),
// and < 2^44 so editionCartId()'s ×100 stays within Number.MAX_SAFE_INTEGER.
export function stableId(psnProductId: string): number {
  let h1 = 0x811c9dc5; // FNV-1a seed
  let h2 = 0x9e3779b9; // golden-ratio seed
  for (let i = 0; i < psnProductId.length; i++) {
    const c = psnProductId.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul((h2 + c) | 0, 0x85ebca77);
  }
  const hi = (h1 >>> 20) & 0xfff; // 12 high bits
  const lo = h2 >>> 0; // 32 bits
  return 10000 + hi * 0x1_0000_0000 + lo;
}

function rowToGame(region: PsnRegion, r: ProductRow): Game {
  const price = r.price_minor != null ? Math.round(r.price_minor / 100) : null;
  const originalPrice =
    r.original_price_minor != null
      ? Math.round(r.original_price_minor / 100)
      : price;

  // postgres.js parses `date` columns as new Date("YYYY-MM-DDT00:00:00") — no Z,
  // so it is LOCAL midnight, not UTC. Use local-time getters (getFullYear etc.)
  // to extract the calendar date the DB actually stored, regardless of server TZ.
  const rawDate = r.release_date as unknown;
  let ymd: [number, number, number] | null = null;
  if (rawDate instanceof Date) {
    ymd = [rawDate.getFullYear(), rawDate.getMonth() + 1, rawDate.getDate()];
  } else if (typeof rawDate === "string" && rawDate) {
    const m = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) ymd = [+m[1], +m[2], +m[3]];
  }
  const releaseDate = ymd
    ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" })
        .format(new Date(ymd[0], ymd[1] - 1, ymd[2]))
    : "";
  const todayYmd = (() => { const t = new Date(); return [t.getFullYear(), t.getMonth() + 1, t.getDate()] as [number, number, number]; })();
  const isPreorder = ymd
    ? ymd[0] > todayYmd[0] || (ymd[0] === todayYmd[0] && ymd[1] > todayYmd[1]) || (ymd[0] === todayYmd[0] && ymd[1] === todayYmd[1] && ymd[2] > todayYmd[2])
    : false;

  const hasLanguage = (values: string[], language: "ru" | "en") =>
    values.some((value) => {
      const normalized = value.trim().toLowerCase();
      return (
        normalized === language ||
        normalized.startsWith(`${language}-`) ||
        normalized.includes(language === "ru" ? "russian" : "english")
      );
    });
  const voiceLanguages = r.voice_languages ?? [];
  const subtitleLanguages = r.subtitle_languages ?? [];

  return {
    id: stableId(r.psn_product_id),
    region: region as "TR",
    title: cleanGameTitle(r.title),
    image: r.image_url ?? "",
    price,
    originalPrice,
    description:
      r.description_ai_full_ru ??
      r.description_ru_text ??
      r.description_ai_ru_text ??
      r.description_original_text ??
      "",
    summaryRu: r.description_ai_summary_ru ?? null,
    platform: (r.platforms ?? []).join(", ") || "PS5",
    russianVoice: hasLanguage(voiceLanguages, "ru"),
    russianSubtitles: hasLanguage(subtitleLanguages, "ru"),
    englishVoice: hasLanguage(voiceLanguages, "en"),
    englishSubtitles: hasLanguage(subtitleLanguages, "en"),
    rating: r.rating != null ? parseFloat(String(r.rating)) : null,
    releaseDate,
    isPreorder,
    psStoreUrl: `https://store.playstation.com/${LOCALE_BY_REGION[region]}/product/${r.psn_product_id}`,
    editions: [{ id: "standard", name: r.title, price, originalPrice }],
    screenshots: r.screenshot_urls ?? [],
    genres: r.genres ?? [],
    publisher: r.publisher,
    ratingsCount: r.ratings_count,
    salesRank: r.sales_rank,
    saleEndDate: (() => {
      const raw = r.sale_end_date as unknown;
      if (!raw) return null;
      if (raw instanceof Date)
        return `${raw.getFullYear()}-${String(raw.getMonth() + 1).padStart(2, "0")}-${String(raw.getDate()).padStart(2, "0")}`;
      const m = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : null;
    })(),
  };
}

function saleProductSelect(region: PsnRegion) {
  return sql<ProductRow[]>`
    SELECT
      p.psn_product_id,
      p.np_title_id,
      p.title,
      p.image_url,
      p.platforms,
      p.store_url,
      p.voice_languages,
      p.subtitle_languages,
      p.rating,
      p.ratings_count,
      p.release_date,
      p.genres,
      p.publisher,
      p.description_ru_text,
      p.description_ai_ru_text,
      p.description_ai_summary_ru,
      p.description_ai_full_ru,
      p.description_original_text,
      p.sales_rank,
      p.sale_end_date,
      p.screenshot_urls,
      s.price_minor,
      s.original_price_minor
    FROM psn_regional_products p
    LEFT JOIN LATERAL (
      SELECT price_minor, original_price_minor
      FROM   psn_price_snapshots
      WHERE  psn_regional_product_id = p.id
      ORDER  BY fetched_at DESC
      LIMIT  1
    ) s ON true
    WHERE p.region = ${region}
      AND s.price_minor IS NOT NULL
      AND s.original_price_minor IS NOT NULL
      AND s.price_minor < s.original_price_minor
    ORDER BY
      (s.original_price_minor - s.price_minor)::float
        / NULLIF(s.original_price_minor, 0) DESC
  `;
}

function dedupByTitle(rows: ProductRow[]): ProductRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.np_title_id ?? row.psn_product_id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const getPsnGamesForRegion = unstable_cache(
  async (region: PsnRegion): Promise<Game[]> => {
    const rows = await saleProductSelect(region);
    return dedupByTitle(rows).map((row) => rowToGame(region, row));
  },
  ["psn-games-for-region"],
  { revalidate: STOREFRONT_CACHE_TTL, tags: [STOREFRONT_CACHE_TAG] },
);

// Cached once per region: a single scan powers every game-detail page (and its
// sibling-edition lookup) for the TTL window instead of one scan per view.
const getAllProductsForRegion = unstable_cache(
  async (region: PsnRegion): Promise<ProductRow[]> =>
    sql<ProductRow[]>`
    SELECT
      p.psn_product_id,
      p.np_title_id,
      p.title,
      p.image_url,
      p.platforms,
      p.store_url,
      p.voice_languages,
      p.subtitle_languages,
      p.rating,
      p.ratings_count,
      p.release_date,
      p.genres,
      p.publisher,
      p.description_ru_text,
      p.description_ai_ru_text,
      p.description_ai_summary_ru,
      p.description_ai_full_ru,
      p.description_original_text,
      p.sales_rank,
      p.sale_end_date,
      p.screenshot_urls,
      s.price_minor,
      s.original_price_minor
    FROM psn_regional_products p
    LEFT JOIN LATERAL (
      SELECT price_minor, original_price_minor
      FROM   psn_price_snapshots
      WHERE  psn_regional_product_id = p.id
      ORDER  BY fetched_at DESC
      LIMIT  1
    ) s ON true
    WHERE p.region = ${region}
  `,
  ["psn-all-products-for-region"],
  { revalidate: STOREFRONT_CACHE_TTL, tags: [STOREFRONT_CACHE_TAG] },
);

export async function getPsnGameById(id: number): Promise<Game | null> {
  // A single region scan covers everything: getAllProductsForRegion already joins
  // the latest price snapshot (price_minor/original_price_minor), so it yields the
  // same prices saleProductSelect would — including pre-orders and new releases —
  // plus the sibling rows needed for edition lookup below. No second query needed.
  const allRows = await getAllProductsForRegion("TR");

  const row = allRows.find((r) => stableId(r.psn_product_id) === id);

  if (!row) return null;

  const game = rowToGame("TR", row);

  // Enrich editions: find all products sharing the same np_title_id.
  if (row.np_title_id) {
    const siblings = allRows
      .filter((r) => r.np_title_id === row.np_title_id)
      .sort(
        (a, b) =>
          (a.price_minor ?? Number.MAX_SAFE_INTEGER) -
          (b.price_minor ?? Number.MAX_SAFE_INTEGER),
      );

    if (siblings.length > 1) {
      // Exclude upgrade/DLC products — they require owning another edition first.
      const standalone = siblings.filter(
        (r) => !/\bupgrade\b/i.test(r.title),
      );
      const candidates = standalone.length >= 1 ? standalone : siblings;

      // Sony sometimes uses the same base title for all editions (e.g. Wolverine
      // Standard and Digital Deluxe both titled "Marvel's Wolverine"). In that case
      // inferEditionName() falls back to "Standard Edition" for both. We recover
      // the real edition type from the psn_product_id suffix (e.g. "WOLVERINEDELUXE0").
      const labelForRow = (r: ProductRow): string => {
        const fromTitle = inferEditionName(r.title);
        if (fromTitle !== "Standard Edition") return fromTitle;
        const suffix = (r.psn_product_id.split("-").pop() ?? "").toUpperCase();
        if (/DELUXE/.test(suffix)) return "Digital Deluxe Edition";
        if (/ULTIMATE/.test(suffix)) return "Ultimate Edition";
        if (/PREMIUM/.test(suffix)) return "Premium Edition";
        if (/COMPLETE/.test(suffix)) return "Complete Edition";
        if (/GOLD/.test(suffix)) return "Gold Edition";
        if (/DEFINITIVE/.test(suffix)) return "Definitive Edition";
        return "Standard Edition";
      };

      // Dedup: for each resolved label keep the product that has a price.
      const byLabel = new Map<string, ProductRow>();
      for (const r of candidates) {
        const label = labelForRow(r);
        const prev = byLabel.get(label);
        if (!prev || (r.price_minor !== null && prev.price_minor === null)) {
          byLabel.set(label, r);
        }
      }

      const deduped = [...byLabel.values()].sort(
        (a, b) =>
          (a.price_minor ?? Number.MAX_SAFE_INTEGER) -
          (b.price_minor ?? Number.MAX_SAFE_INTEGER),
      );

      if (deduped.length > 0) {
        game.editions = deduped.map((r) => {
          const fromTitle = inferEditionName(r.title);
          const label = fromTitle !== "Standard Edition" ? undefined : labelForRow(r) !== "Standard Edition" ? labelForRow(r) : undefined;
          return {
            id: String(stableId(r.psn_product_id)),
            name: r.title,
            ...(label ? { label } : {}),
            price: r.price_minor != null ? Math.round(r.price_minor / 100) : null,
            originalPrice:
              r.original_price_minor != null
                ? Math.round(r.original_price_minor / 100)
                : null,
            image: r.image_url ?? null,
          };
        });
      }
    }
  }

  return game;
}

// ─── Collections ─────────────────────────────────────────────────────────────

export type CollectionSection = {
  id: string;
  nameRu: string;
  games: Game[];
};

export const getCollectionsForRegion = unstable_cache(
  async (region: PsnRegion): Promise<CollectionSection[]> => {
  type CollectionRow = {
    collection_id: string;
    name_ru: string;
  } & ProductRow;

  const rows = await sql<CollectionRow[]>`
    SELECT
      c.id          AS collection_id,
      c.name_ru,
      p.psn_product_id,
      p.np_title_id,
      p.title,
      p.image_url,
      p.platforms,
      p.store_url,
      p.voice_languages,
      p.subtitle_languages,
      p.rating,
      p.ratings_count,
      p.release_date,
      p.genres,
      p.publisher,
      p.description_ru_text,
      p.description_ai_ru_text,
      p.description_ai_summary_ru,
      p.description_ai_full_ru,
      p.description_original_text,
      p.sales_rank,
      p.sale_end_date,
      p.screenshot_urls,
      s.price_minor,
      s.original_price_minor
    FROM psn_collections c
    JOIN psn_collection_items ci ON ci.collection_id = c.id
    JOIN psn_regional_products p ON p.id = ci.psn_regional_product_id
    LEFT JOIN LATERAL (
      SELECT price_minor, original_price_minor
      FROM   psn_price_snapshots
      WHERE  psn_regional_product_id = p.id
      ORDER  BY fetched_at DESC
      LIMIT  1
    ) s ON true
    WHERE c.region = ${region}
      AND c.is_active = true
    ORDER BY c.name_ru, ci.display_rank
  `;

  const byCollection = new Map<string, CollectionSection>();
  const seenTitles = new Map<string, Set<string>>();

  for (const row of rows) {
    if (!byCollection.has(row.collection_id)) {
      byCollection.set(row.collection_id, {
        id: row.collection_id,
        nameRu: row.name_ru,
        games: [],
      });
      seenTitles.set(row.collection_id, new Set());
    }
    const titleKey = row.np_title_id ?? row.psn_product_id;
    if (seenTitles.get(row.collection_id)!.has(titleKey)) continue;
    seenTitles.get(row.collection_id)!.add(titleKey);
    byCollection.get(row.collection_id)!.games.push(rowToGame(region, row));
  }

  return [...byCollection.values()];
  },
  ["psn-collections-for-region"],
  { revalidate: STOREFRONT_CACHE_TTL, tags: [STOREFRONT_CACHE_TAG] },
);

export { WELL_KNOWN_COLLECTIONS };

// ─── Featured promo ───────────────────────────────────────────────────────────

export type FeaturedPromoResult = {
  game: Game;
  releaseLabel: string;
  ctaLabel: string;
};

export const getFeaturedPromoForRegion = unstable_cache(
  async (region: PsnRegion): Promise<FeaturedPromoResult | null> => {
  const promo = FEATURED_PROMOS.find((p) => p.region === region);
  if (!promo) return null;

  const rows = await sql<ProductRow[]>`
    SELECT
      p.psn_product_id,
      p.title,
      p.image_url,
      p.platforms,
      p.store_url,
      p.voice_languages,
      p.subtitle_languages,
      p.rating,
      p.ratings_count,
      p.release_date,
      p.genres,
      p.publisher,
      p.description_ru_text,
      p.description_ai_ru_text,
      p.description_ai_summary_ru,
      p.description_ai_full_ru,
      p.description_original_text,
      p.sales_rank,
      p.sale_end_date,
      p.screenshot_urls,
      s.price_minor,
      s.original_price_minor
    FROM psn_regional_products p
    LEFT JOIN LATERAL (
      SELECT price_minor, original_price_minor
      FROM   psn_price_snapshots
      WHERE  psn_regional_product_id = p.id
      ORDER  BY fetched_at DESC
      LIMIT  1
    ) s ON true
    WHERE p.region = ${region}
      AND p.psn_product_id = ${promo.psnProductId}
    LIMIT 1
  `;

  if (rows.length === 0) return null;
  return {
    game: rowToGame(region, rows[0]),
    releaseLabel: promo.releaseLabel,
    ctaLabel: promo.ctaLabel,
  };
  },
  ["psn-featured-promo-for-region"],
  { revalidate: STOREFRONT_CACHE_TTL, tags: [STOREFRONT_CACHE_TAG] },
);
