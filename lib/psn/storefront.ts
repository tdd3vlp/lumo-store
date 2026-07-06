import "server-only";
import { createDatabaseClient } from "@/lib/database";
import type { Game } from "@/data/mockGames";
import type { PsnRegion } from "./types";
import { WELL_KNOWN_COLLECTIONS, LOCALE_BY_REGION } from "./types";
import { FEATURED_PROMOS } from "@/lib/featured-promo";

const sql = createDatabaseClient(3);

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
  description_original_text: string | null;
  sales_rank: number | null;
  sale_end_date: string | null;
  screenshot_urls: string[];
};

export function stableId(psnProductId: string): number {
  let h = 0;
  for (let i = 0; i < psnProductId.length; i++) {
    h = (Math.imul(31, h) + psnProductId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) + 10000;
}

function rowToGame(region: PsnRegion, r: ProductRow): Game {
  const price = r.price_minor != null ? Math.round(r.price_minor / 100) : null;
  const originalPrice =
    r.original_price_minor != null
      ? Math.round(r.original_price_minor / 100)
      : price;

  const releaseDate = r.release_date
    ? new Date(r.release_date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

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
    title: r.title,
    image: r.image_url ?? "",
    price,
    originalPrice,
    description: r.description_ru_text ?? r.description_original_text ?? "",
    platform: (r.platforms ?? []).join(", ") || "PS5",
    russianVoice: hasLanguage(voiceLanguages, "ru"),
    russianSubtitles: hasLanguage(subtitleLanguages, "ru"),
    englishVoice: hasLanguage(voiceLanguages, "en"),
    englishSubtitles: hasLanguage(subtitleLanguages, "en"),
    rating: r.rating != null ? parseFloat(String(r.rating)) : null,
    releaseDate,
    psStoreUrl: `https://store.playstation.com/${LOCALE_BY_REGION[region]}/product/${r.psn_product_id}`,
    editions: [{ id: "standard", name: r.title, price, originalPrice }],
    screenshots: r.screenshot_urls ?? [],
    genres: r.genres ?? [],
    publisher: r.publisher,
    ratingsCount: r.ratings_count,
    salesRank: r.sales_rank,
    saleEndDate: r.sale_end_date
      ? new Date(r.sale_end_date).toISOString().slice(0, 10)
      : null,
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

export async function getPsnGamesForRegion(region: PsnRegion): Promise<Game[]> {
  const rows = await saleProductSelect(region);
  return dedupByTitle(rows).map((row) => rowToGame(region, row));
}

async function getAllProductsForRegion(region: PsnRegion): Promise<ProductRow[]> {
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
  `;
}

export async function getPsnGameById(id: number): Promise<Game | null> {
  // Fetch both in parallel: saleRows for accurate discount prices, allRows for
  // non-sale products (pre-orders, new releases) and for sibling editions lookup.
  const [saleRows, allRows] = await Promise.all([
    saleProductSelect("TR"),
    getAllProductsForRegion("TR"),
  ]);

  // Prefer the sale row (has confirmed price_minor < original_price_minor).
  const row =
    saleRows.find((r) => stableId(r.psn_product_id) === id) ??
    allRows.find((r) => stableId(r.psn_product_id) === id);

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
      game.editions = siblings.map((r) => ({
        id: String(stableId(r.psn_product_id)),
        name: r.title,
        price: r.price_minor != null ? Math.round(r.price_minor / 100) : null,
        originalPrice:
          r.original_price_minor != null
            ? Math.round(r.original_price_minor / 100)
            : null,
      }));
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

export async function getCollectionsForRegion(
  region: PsnRegion,
): Promise<CollectionSection[]> {
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
}

export { WELL_KNOWN_COLLECTIONS };

// ─── Featured promo ───────────────────────────────────────────────────────────

export type FeaturedPromoResult = {
  game: Game;
  releaseLabel: string;
  ctaLabel: string;
};

export async function getFeaturedPromoForRegion(
  region: PsnRegion,
): Promise<FeaturedPromoResult | null> {
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
}
