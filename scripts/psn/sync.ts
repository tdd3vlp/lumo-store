/**
 * One-command PSN sync: import a category, write sale/collection metadata,
 * then enrich any new products that still lack description/rating data.
 *
 * Sale mode (--until required):
 *   npm run psn:sync -- \
 *     --region=IN \
 *     --url="https://store.playstation.com/en-in/category/.../1?sortBy=sales30&sortOrder=desc" \
 *     --until=2026-07-02 \
 *     --pages=5
 *
 * Collection mode (--collection required, --until optional):
 *   npm run psn:sync -- \
 *     --region=IN \
 *     --url="https://store.playstation.com/en-in/category/.../1" \
 *     --collection="Великолепные игры 2026 года" \
 *     --pages=3
 *
 * Both flags can be combined to mark a sale-priced collection.
 */

import "../env";
import { PsnBrowserClient } from "../../lib/psn/browser-client";
import {
  createJob,
  listProductsNeedingEnrichment,
  upsertProductDetail,
} from "../../lib/psn/db";
import { runImportJob } from "../../lib/psn/importer";
import { parseProductFromWCA } from "../../lib/psn/parser";
import type { PsnRegion } from "../../lib/psn/types";

type SyncOptions = {
  region: PsnRegion;
  url: string;
  until: string | null;
  collection: string | null;
  pages: number;
  dryRun: boolean;
};

const PRODUCT_LOCALE: Record<PsnRegion, string> = {
  TR: "en-tr",
  UA: "ru-ua",
};

function readFlag(name: string): string | undefined {
  const args = process.argv.slice(2);
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`);
}

function usage(): never {
  console.error(
    [
      "Usage:",
      "  npm run psn:sync -- --region=IN|TR --url=<category-url> --pages=N [--until=YYYY-MM-DD] [--collection='Name'] [--dry-run]",
      "",
      "  --until       Sale end date; writes sale_end_date + sales_rank on each product.",
      "  --collection  Russian display name; creates/updates a psn_collections row.",
      "  At least one of --until or --collection must be provided.",
      "  Use ?sortBy=sales30&sortOrder=desc on the URL for correct Лидеры продаж order.",
    ].join("\n"),
  );
  process.exit(1);
}

function parseOptions(): SyncOptions {
  const region = readFlag("region");
  const url = readFlag("url");
  const until = readFlag("until") ?? null;
  const collection = readFlag("collection") ?? null;
  const pagesRaw = readFlag("pages") ?? "1";
  const pages = Number(pagesRaw);

  if (region !== "TR" && region !== "UA") usage();
  if (!url || !url.startsWith("https://store.playstation.com/")) usage();
  if (until && !/^\d{4}-\d{2}-\d{2}$/.test(until)) usage();
  if (!Number.isInteger(pages) || pages < 1 || pages > 100) usage();
  if (!until && !collection) {
    console.error("Error: provide at least one of --until or --collection.\n");
    usage();
  }

  return { region, url, until, collection, pages, dryRun: hasFlag("dry-run") };
}

function warnIfNotSalesSorted(url: string) {
  const parsed = new URL(url);
  if (
    parsed.searchParams.get("sortBy") !== "sales30" ||
    parsed.searchParams.get("sortOrder") !== "desc"
  ) {
    console.warn(
      "Warning: URL is not sorted by sales30 desc; sales_rank reflects page order, not sales leaders.",
    );
  }
}

function productUrl(region: PsnRegion, psnProductId: string): string {
  return `https://store.playstation.com/${PRODUCT_LOCALE[region]}/product/${psnProductId}`;
}

function ruProductUrl(psnProductId: string): string {
  return `https://store.playstation.com/ru-ua/product/${psnProductId}`;
}

async function enrichMissingProducts(region: PsnRegion, limit: number) {
  const products = await listProductsNeedingEnrichment(region, limit);
  if (products.length === 0) {
    console.log("Enrichment: nothing to do.");
    return { saved: 0, failed: 0 };
  }

  console.log(`Enrichment: ${products.length} product(s) need detail data.`);

  const browser = new PsnBrowserClient();
  await browser.launch();

  let saved = 0;
  let failed = 0;

  try {
    for (const { psnProductId } of products) {
      process.stdout.write(`  ${psnProductId.slice(0, 40)} … `);

      try {
        const wca = await browser.fetchProductDetail(productUrl(region, psnProductId));
        let ruWca = null;
        try {
          ruWca = await browser.fetchProductDetail(ruProductUrl(psnProductId));
        } catch {
          // Best-effort RU enrichment.
        }

        const detail = parseProductFromWCA(wca, ruWca);
        await upsertProductDetail(region, psnProductId, detail);

        const genre = detail.genres[0] ?? "-";
        const rating = detail.rating != null ? detail.rating.toFixed(2) : "-";
        console.log(`ok  ${genre} | ★${rating}`);
        saved += 1;
      } catch (err) {
        console.log(`fail  ${(err as Error).message.slice(0, 100)}`);
        failed += 1;
      }
    }
  } finally {
    await browser.close();
  }

  return { saved, failed };
}

const opts = parseOptions();
warnIfNotSalesSorted(opts.url);

console.log("PSN sync");
console.log(`  region:     ${opts.region}`);
console.log(`  url:        ${opts.url}`);
console.log(`  until:      ${opts.until ?? "(none)"}`);
console.log(`  collection: ${opts.collection ?? "(none)"}`);
console.log(`  pages:      ${opts.pages}`);
console.log(`  mode:       ${opts.dryRun ? "dry-run" : "write"}`);

const jobId = await createJob({
  region: opts.region,
  categoryUrl: opts.url,
  pageFrom: 1,
  pageTo: opts.pages,
  dryRun: opts.dryRun,
  saleEndDate: opts.until,
});

console.log(`Import job: ${jobId}`);

await runImportJob(jobId, {
  region: opts.region,
  categoryUrl: opts.url,
  pageFrom: 1,
  pageTo: opts.pages,
  dryRun: opts.dryRun,
  saleEndDate: opts.until,
  collectionName: opts.collection,
  throwOnLockFailure: true, // CLI: fail fast if another sync is running
});

if (opts.dryRun) {
  console.log("Dry-run complete; enrichment skipped.");
  process.exit(0);
}

const enrichLimit = opts.pages * 24;
const result = await enrichMissingProducts(opts.region, enrichLimit);

console.log(`Done: price snapshots updated, enriched ${result.saved}, failed ${result.failed}.`);
process.exit(result.failed > 0 ? 1 : 0);
