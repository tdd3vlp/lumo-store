/**
 * One-shot import: fetch pages 1-5 of the Mid-Year Deals category
 * for Turkey (TRY) and write results to the local DB.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/psn/import-sales.ts
 *
 * Filters: only FULL_GAME / GAME_BUNDLE / PREMIUM_EDITION — no DLC / items.
 */

import { createJob } from "../../lib/psn/db";
import { runImportJob } from "../../lib/psn/importer";
import type { PsnRegion } from "../../lib/psn/types";

const PAGES = 5;

const JOBS: { region: PsnRegion; url: string }[] = [
  {
    region: "TR",
    url: "https://store.playstation.com/en-tr/category/8ea5585b-0cd7-4a43-9b7d-23ef0b475e35/1",
  },
];

for (const { region, url } of JOBS) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`Region: ${region}  pages 1–${PAGES}`);
  console.log(`URL:    ${url}`);
  console.log("═".repeat(60));

  const jobId = await createJob({
    region,
    categoryUrl: url,
    pageFrom: 1,
    pageTo: PAGES,
    dryRun: false,
  });

  console.log(`Job ID: ${jobId}`);

  await runImportJob(jobId, {
    region,
    categoryUrl: url,
    pageFrom: 1,
    pageTo: PAGES,
    dryRun: false,
  });

  console.log(`Done: ${region}`);
}

console.log("\nAll imports complete.");
process.exit(0);
