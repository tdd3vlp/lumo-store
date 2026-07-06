/**
 * Enrich already-imported PSN products with detail-page data:
 *   description, publisher, release date, genres, rating, voice/subtitle languages,
 *   and Russian description (best-effort from /ru-ua/ with the same product ID).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/psn/enrich-products.ts [--region IN|TR|ALL]
 *
 * Throttle: ~3 s per product (one page load per product, +1 optional RU page).
 * 170 products ≈ 15-20 min total.
 */

import { PsnBrowserClient } from "../../lib/psn/browser-client";
import { parseProductFromWCA } from "../../lib/psn/parser";
import {
  listProductsNeedingEnrichment,
  upsertProductDetail,
} from "../../lib/psn/db";
import type { PsnRegion } from "../../lib/psn/types";

const args = process.argv.slice(2);
const regionArg = args.find((a) => a.startsWith("--region="))?.split("=")[1]
  ?? args[args.indexOf("--region") + 1]
  ?? "ALL";
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? Number(limitArg) : 200;

const REGIONS: PsnRegion[] = regionArg === "ALL" ? ["TR"] : [regionArg as PsnRegion];

// Category URL used only for the Akamai session challenge (any category works)
const CATEGORY_URL_FOR_SESSION: Record<PsnRegion, string> = {
  TR: "https://store.playstation.com/en-tr/category/3f772501-f6f8-49b7-abac-874a88ca4897/1",
  UA: "https://store.playstation.com/ru-ua/category/44d8bb20-653e-431e-8ad9-4f981f71cf23/1",
};

// Locale → store base for building product URL in that locale
const LOCALE: Record<PsnRegion, string> = {
  TR: "en-tr",
  UA: "ru-ua",
};

function productUrl(region: PsnRegion, psnProductId: string): string {
  return `https://store.playstation.com/${LOCALE[region]}/product/${psnProductId}`;
}

function ruProductUrl(psnProductId: string): string {
  return `https://store.playstation.com/ru-ua/product/${psnProductId}`;
}

let totalSaved = 0;
let totalFailed = 0;

for (const region of REGIONS) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Enriching ${region} products…`);

  const products = await listProductsNeedingEnrichment(region, limit);
  console.log(`  ${products.length} products need enrichment`);

  if (products.length === 0) continue;

  const browser = new PsnBrowserClient();
  await browser.launch();

  // Pass Akamai challenge via category page (stronger validation than product page).
  // fetchProductDetail() uses browser HTTP stack after this, no new pages per product.
  await browser.initSession(CATEGORY_URL_FOR_SESSION[region]);
  console.log("  Browser session established (Akamai OK)");

  let saved = 0;
  let failed = 0;

  for (const { psnProductId } of products) {
    const url = productUrl(region, psnProductId);
    process.stdout.write(`  ${psnProductId.slice(0, 40)} … `);

    try {
      const wca = await browser.fetchProductDetail(url);

      // Best-effort: try the same product ID on /ru-ua/ for Russian description.
      let ruWca = null;
      try {
        ruWca = await browser.fetchProductDetail(ruProductUrl(psnProductId));
      } catch {
        // No RU equivalent — leave description_ru NULL.
      }

      const detail = parseProductFromWCA(wca, ruWca);
      await upsertProductDetail(region, psnProductId, detail);

      const hasRu = !!detail.longDescriptionRuText;
      const genre = detail.genres[0] ?? "—";
      const rating = detail.rating != null ? detail.rating.toFixed(2) : "—";
      console.log(`✓  ${genre} | ★${rating} | RU=${hasRu ? "✓" : "✗"}`);
      saved++;
    } catch (err) {
      console.log(`✗  ${(err as Error).message.slice(0, 80)}`);
      failed++;
    }
  }

  await browser.close();
  totalSaved += saved;
  totalFailed += failed;
  console.log(`\n${region} done: ${saved} enriched, ${failed} failed`);
}

console.log(`\nAll done: ${totalSaved} enriched, ${totalFailed} failed`);
process.exit(0);
