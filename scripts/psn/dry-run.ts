/**
 * Dry-run PSN parser against a live PS Store URL via Playwright.
 *
 * PS Store uses full CSR — product data comes from GraphQL, not HTML.
 * This script launches headless Chromium, navigates to the page (which lets
 * Akamai validate the session), then fires the categoryGridRetrieve query
 * and prints what was found.
 *
 * Usage:
 *   npm run psn:dry-run <category-url>
 *   npm run psn:dry-run https://store.playstation.com/en-in/category/<uuid>/1
 *
 * Pass --save to write the raw GraphQL JSON to /tmp/psn-gql-fixture.json
 * for use as a test fixture.
 */

import { writeFile } from "node:fs/promises";
import { validateStoreUrl } from "../../lib/psn/client";
import {
  PsnBrowserClient,
  regionFromCategoryUrl,
} from "../../lib/psn/browser-client";
import { parseCategoryGQL } from "../../lib/psn/parser";

const args = process.argv.slice(2);
const saveFlag = args.includes("--save");
const url = args.find((a) => !a.startsWith("--"));

if (!url) {
  console.error("Usage: tsx scripts/psn/dry-run.ts <ps-store-category-url> [--save]");
  console.error("  --save  write raw GraphQL JSON to /tmp/psn-gql-fixture.json");
  process.exit(1);
}

try {
  validateStoreUrl(url);
} catch (err) {
  console.error(`URL validation failed: ${(err as Error).message}`);
  process.exit(1);
}

if (url.includes("/product/")) {
  console.error("Product detail pages not yet supported (only category URLs).");
  console.error("Pass a /category/<uuid>/1 URL instead.");
  process.exit(1);
}

let region: ReturnType<typeof regionFromCategoryUrl>;

try {
  region = regionFromCategoryUrl(url);
} catch (err) {
  console.error(`URL parse error: ${(err as Error).message}`);
  process.exit(1);
}

console.log(`Fetching: ${url}`);
console.log(`Region: ${region}`);
console.log("Launching headless Chromium…");

const browser = new PsnBrowserClient();

try {
  await browser.launch();
  console.log("Navigating (Akamai session init)…");
  await browser.initSession(url);
  console.log("Session established. Querying GraphQL…\n");

  const grid = await browser.fetchCategoryPage(1);

  const { totalCount, isLast, size } = grid.pageInfo;
  const estimatedPages = Math.ceil(totalCount / size);
  console.log(`=== Category grid: ${totalCount} total products (~${estimatedPages} pages) ===`);
  console.log(`  isLast: ${isLast}, page size: ${size}\n`);

  const products = parseCategoryGQL(grid, region);

  console.log(`=== Page 1 — ${products.length} products ===`);
  for (const p of products) {
    const price =
      p.priceMinor != null
        ? `${p.currencyCode} ${(p.priceMinor / 100).toFixed(2)}`
        : "free / price unavailable";
    const discount =
      p.originalPriceMinor != null
        ? ` (orig ${(p.originalPriceMinor / 100).toFixed(2)})`
        : "";
    console.log(
      `  ${p.psnProductId}  ${p.name.padEnd(50).slice(0, 50)}  ${price}${discount}  [${p.platforms.join(",")}]`,
    );
  }

  console.log(`\nnpTitleId sample:`);
  for (const p of products.slice(0, 3)) {
    console.log(`  ${p.psnProductId} → ${p.npTitleId}`);
  }

  if (saveFlag) {
    const fixturePath = "/tmp/psn-gql-fixture.json";
    await writeFile(fixturePath, JSON.stringify(grid, null, 2), "utf8");
    console.log(`\nRaw GraphQL response saved to ${fixturePath}`);
  } else {
    console.log("\nTip: re-run with --save to write the raw GQL JSON as a fixture.");
  }
} catch (err) {
  console.error(`\nError: ${(err as Error).message}`);
  process.exit(1);
} finally {
  await browser.close();
}
