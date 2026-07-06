/**
 * Direct import script — bypasses HTTP auth, calls runImportJob directly.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/psn/run-import.ts \
 *     --region=TR \
 *     --url="https://store.playstation.com/en-tr/category/<uuid>/1" \
 *     [--pages=7] [--dry-run] [--collection="Sale Name"]
 */

import "../env";
import { runImportJob } from "../../lib/psn/importer";
import { createJob } from "../../lib/psn/db";
import type { PsnRegion } from "../../lib/psn/types";

const args = process.argv.slice(2);

function arg(name: string): string | undefined {
  return args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
}

const region = (arg("region") ?? "TR") as PsnRegion;
const categoryUrl = arg("url");
const pages = parseInt(arg("pages") ?? "7", 10);
const dryRun = args.includes("--dry-run");
const collectionName = arg("collection");

if (!categoryUrl) {
  console.error("Usage: --url=<psn-category-url> [--region=TR] [--pages=7] [--dry-run] [--collection=Name]");
  process.exit(1);
}

const jobId = await createJob({ region, categoryUrl, dryRun, pageFrom: 1, pageTo: pages });
console.log(`Job ${jobId} created (${dryRun ? "dry-run" : "live"}, pages 1-${pages})`);

await runImportJob(jobId, {
  categoryUrl,
  region,
  pageFrom: 1,
  pageTo: pages,
  dryRun,
  collectionName,
});

console.log(`\nJob ${jobId} completed.`);
process.exit(0);
