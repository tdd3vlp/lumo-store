// NOTE: intentionally NOT `server-only`. These helpers run both in Next route
// handlers and in the standalone worker (scripts/psn/worker.ts) under tsx, where
// Next's `server-only` alias isn't available. We build the pool from the same
// node-safe factory the CLI scripts use, reusing the shared dev singleton.
import { createDatabaseClient } from "@/lib/database";
import type {
  ImportJobOptions,
  ImportJobStatus,
  JobEvent,
  PendingJobRow,
  PsnRegion,
} from "./types";
import type { ParsedCategoryProduct, ParsedProductDetail } from "./types";
import { PARSER_VERSION } from "./parser";

declare global {
  var __lumoSql: ReturnType<typeof createDatabaseClient> | undefined;
}

// Reuse the shared dev singleton (set by @/lib/db) so hot-reload doesn't leak
// pools; create one otherwise. All PSN db ops use this single instance, which
// the advisory-lock reserved-connection logic relies on.
const sql =
  globalThis.__lumoSql ??
  createDatabaseClient(Number(process.env.DATABASE_POOL_SIZE ?? 10));

if (process.env.NODE_ENV !== "production") {
  globalThis.__lumoSql = sql;
}

// postgres sql.json() expects JSONValue (no `unknown`), cast at call sites.
type PgJsonValue = Parameters<typeof sql.json>[0];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const j = (v: unknown) => sql.json(v as any as PgJsonValue);

const ADVISORY_LOCK_KEY = 7391027; // arbitrary stable key for PSN import

// ─── Jobs ────────────────────────────────────────────────────────────────────

export async function createJob(opts: ImportJobOptions): Promise<string> {
  const [row] = await sql`
    INSERT INTO psn_import_jobs
      (region, category_url, page_from, page_to, dry_run, sale_end_date)
    VALUES
      (
        ${opts.region},
        ${opts.categoryUrl},
        ${opts.pageFrom},
        ${opts.pageTo},
        ${opts.dryRun},
        ${opts.saleEndDate ?? null}::date
      )
    RETURNING id
  `;
  return row.id as string;
}

// Atomically transition a specific job pending → running. Returns true only for
// the caller that won the claim, so the POST fast-path and the worker loop can
// never double-run the same job.
export async function claimJob(id: string): Promise<boolean> {
  const rows = await sql`
    UPDATE psn_import_jobs
    SET status = 'running', started_at = now(), updated_at = now()
    WHERE id = ${id} AND status = 'pending'
    RETURNING id
  `;
  return rows.length > 0;
}

// Claim the oldest pending job (FOR UPDATE SKIP LOCKED so concurrent workers
// don't collide). Used by the worker loop to pick up orphaned/queued jobs.
export async function claimNextPendingJob(): Promise<PendingJobRow | null> {
  const [row] = await sql`
    UPDATE psn_import_jobs
    SET status = 'running', started_at = now(), updated_at = now()
    WHERE id = (
      SELECT id FROM psn_import_jobs
      WHERE status = 'pending'
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id, region, category_url, page_from, page_to, dry_run
  `;
  if (!row) return null;
  return {
    id: row.id as string,
    region: row.region as PendingJobRow["region"],
    categoryUrl: row.category_url as string,
    pageFrom: row.page_from as number,
    pageTo: row.page_to as number,
    dryRun: row.dry_run as boolean,
  };
}

// Release a claim back to pending (e.g. couldn't acquire the global import lock)
// so a later run or the worker can retry it instead of losing the job.
export async function requeueJob(id: string): Promise<void> {
  await sql`
    UPDATE psn_import_jobs
    SET status = 'pending', started_at = NULL, updated_at = now()
    WHERE id = ${id}
  `;
}

export async function getJobStatus(id: string): Promise<string | null> {
  const [row] = await sql`SELECT status FROM psn_import_jobs WHERE id = ${id}`;
  return row ? (row.status as string) : null;
}

export async function updateJob(
  id: string,
  patch: {
    status?: ImportJobStatus;
    pagesFetched?: number;
    productsSeen?: number;
    productsUpserted?: number;
    errorMessage?: string | null;
    startedAt?: Date;
    finishedAt?: Date;
  },
): Promise<void> {
  await sql`
    UPDATE psn_import_jobs
    SET
      status            = COALESCE(${patch.status ?? null}::psn_job_status, status),
      pages_fetched     = COALESCE(${patch.pagesFetched ?? null}, pages_fetched),
      products_seen     = COALESCE(${patch.productsSeen ?? null}, products_seen),
      products_upserted = COALESCE(${patch.productsUpserted ?? null}, products_upserted),
      error_message     = ${patch.errorMessage !== undefined ? patch.errorMessage : sql`error_message`},
      started_at        = COALESCE(${patch.startedAt ?? null}, started_at),
      finished_at       = COALESCE(${patch.finishedAt ?? null}, finished_at),
      updated_at        = now()
    WHERE id = ${id}
  `;
}

export async function appendEvent(
  jobId: string,
  event: JobEvent,
): Promise<void> {
  await sql`
    INSERT INTO psn_import_job_events (job_id, event_type, message, payload)
    VALUES (
      ${jobId},
      ${event.type},
      ${event.message},
      ${event.payload ? j(event.payload) : null}
    )
  `;
}

export async function listJobs(limit = 20) {
  return sql`
    SELECT id, status, region, category_url, page_from, page_to,
           dry_run, pages_fetched, products_seen, products_upserted,
           error_message, started_at, finished_at, created_at, sale_end_date,
           (staged_products IS NOT NULL) AS has_staged
    FROM psn_import_jobs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function saveStagedProducts(
  jobId: string,
  products: Array<ParsedCategoryProduct & { salesRank: number }>,
): Promise<void> {
  await sql`
    UPDATE psn_import_jobs
    SET staged_products = ${j(products)}, updated_at = now()
    WHERE id = ${jobId}
  `;
}

export async function getStagedProducts(
  jobId: string,
): Promise<Array<ParsedCategoryProduct & { salesRank: number }> | null> {
  const [row] = await sql`
    SELECT staged_products, region, category_url, page_from, page_to, sale_end_date
    FROM psn_import_jobs
    WHERE id = ${jobId} AND dry_run = true AND status = 'done'
  `;
  if (!row || !row.staged_products) return null;
  return row.staged_products as Array<ParsedCategoryProduct & { salesRank: number }>;
}

export async function getStagedJobMeta(jobId: string): Promise<{
  region: PsnRegion;
  categoryUrl: string;
  saleEndDate: string | null;
} | null> {
  const [row] = await sql`
    SELECT region, category_url, sale_end_date
    FROM psn_import_jobs
    WHERE id = ${jobId} AND dry_run = true AND status = 'done'
  `;
  if (!row) return null;
  return {
    region: row.region as PsnRegion,
    categoryUrl: row.category_url as string,
    saleEndDate: row.sale_end_date ? String(row.sale_end_date).slice(0, 10) : null,
  };
}

export async function getJobEvents(jobId: string, afterId: number) {
  return sql`
    SELECT id, event_type, message, payload, created_at
    FROM psn_import_job_events
    WHERE job_id = ${jobId} AND id > ${afterId}
    ORDER BY id
  `;
}

// Reap only *stale* running jobs — ones whose heartbeat (updated_at, bumped
// after every page) hasn't advanced in `staleMinutes`. A live import on another
// worker keeps a fresh updated_at and is never touched. Default 15 min comfortably
// clears the worst-case in-fetch block backoff (~6 min) without racing it.
// NOTE: must NOT be called per-request — only on worker boot.
export async function reapStaleJobs(staleMinutes = 15): Promise<number> {
  const rows = await sql`
    UPDATE psn_import_jobs
    SET status = 'failed',
        error_message = ${`No heartbeat for ${staleMinutes}+ min — presumed orphaned`},
        finished_at = now(),
        updated_at = now()
    WHERE status = 'running'
      AND updated_at < now() - ${`${staleMinutes} minutes`}::interval
    RETURNING id
  `;
  return rows.length;
}

// ─── Regional products ───────────────────────────────────────────────────────

export async function upsertCategoryProduct(
  region: PsnRegion,
  storeUrl: string,
  product: ParsedCategoryProduct,
  sale?: { salesRank?: number | null; saleEndDate?: string | null },
): Promise<{ id: string; isNew: boolean }> {
  const [row] = await sql`
    INSERT INTO psn_regional_products
      (region, psn_product_id, np_title_id, store_url, title, image_url,
       platforms, sales_rank, sale_end_date, raw_json, last_seen_at)
    VALUES (
      ${region}, ${product.psnProductId}, ${product.npTitleId},
      ${storeUrl}, ${product.name}, ${product.imageUrl},
      ${sql.array(product.platforms)},
      ${sale?.salesRank ?? null},
      ${(sale?.saleEndDate ?? product.promotionEndDate?.slice(0, 10)) ?? null}::date,
      ${j({ psnProductId: product.psnProductId })},
      now()
    )
    ON CONFLICT (region, psn_product_id) DO UPDATE SET
      title        = EXCLUDED.title,
      image_url    = COALESCE(EXCLUDED.image_url, psn_regional_products.image_url),
      np_title_id  = COALESCE(EXCLUDED.np_title_id, psn_regional_products.np_title_id),
      platforms    = EXCLUDED.platforms,
      sales_rank   = COALESCE(EXCLUDED.sales_rank, psn_regional_products.sales_rank),
      sale_end_date = COALESCE(EXCLUDED.sale_end_date, psn_regional_products.sale_end_date),
      last_seen_at = now()
    RETURNING id, (xmax = 0) AS is_new
  `;
  return { id: row.id as string, isNew: Boolean(row.is_new) };
}

export async function upsertProductDetail(
  region: PsnRegion,
  psnProductId: string,
  detail: ParsedProductDetail,
): Promise<void> {
  await sql`
    UPDATE psn_regional_products SET
      voice_languages           = ${sql.array(detail.voiceLanguages)},
      subtitle_languages        = ${sql.array(detail.subtitleLanguages)},
      publisher                 = COALESCE(${detail.publisher}, publisher),
      release_date              = COALESCE(${detail.releaseDate ? new Date(detail.releaseDate) : null}::timestamptz, release_date),
      description_original_html = ${detail.longDescriptionHtml},
      description_original_text = ${detail.longDescriptionText},
      description_ru_html       = COALESCE(${detail.longDescriptionRuHtml}, description_ru_html),
      description_ru_text       = COALESCE(${detail.longDescriptionRuText}, description_ru_text),
      genres                    = ${sql.array(detail.genres)},
      rating                    = COALESCE(${detail.rating}, rating),
      ratings_count             = COALESCE(${detail.ratingsCount}, ratings_count),
      screenshot_urls           = CASE
                                    WHEN ${sql.array(detail.screenshotUrls)} <> '{}'
                                    THEN ${sql.array(detail.screenshotUrls)}
                                    ELSE screenshot_urls
                                  END,
      sale_end_date             = COALESCE(
                                    ${detail.promotionEndDate ? detail.promotionEndDate.slice(0, 10) : null}::date,
                                    sale_end_date
                                  ),
      raw_json                  = raw_json || ${j(detail.rawJson)},
      parser_version            = ${PARSER_VERSION},
      last_seen_at              = now()
    WHERE region = ${region} AND psn_product_id = ${psnProductId}
  `;
}

export async function upsertAiDescription(
  region: PsnRegion,
  psnProductId: string,
  fields: { translationRu: string | null; summaryRu: string; fullRu: string },
): Promise<void> {
  await sql`
    UPDATE psn_regional_products SET
      description_ai_ru_text    = COALESCE(${fields.translationRu}, description_ai_ru_text),
      description_ai_summary_ru = ${fields.summaryRu},
      description_ai_full_ru    = ${fields.fullRu}
    WHERE region = ${region} AND psn_product_id = ${psnProductId}
  `;
}

export async function listProductsNeedingAiEnrichment(
  region: PsnRegion,
  limit = 200,
): Promise<Array<{
  psnProductId: string;
  title: string;
  descriptionOriginalText: string | null;
  descriptionRuText: string | null;
}>> {
  const rows = await sql`
    SELECT psn_product_id, title, description_original_text, description_ru_text
    FROM psn_regional_products
    WHERE region = ${region}
      AND (description_ai_summary_ru IS NULL OR description_ai_full_ru IS NULL)
      AND description_original_text IS NOT NULL
    ORDER BY last_seen_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    psnProductId: r.psn_product_id as string,
    title: r.title as string,
    descriptionOriginalText: r.description_original_text as string | null,
    descriptionRuText: r.description_ru_text as string | null,
  }));
}

// Products that still need detail enrichment (no description or rating yet).
export async function listProductsNeedingEnrichment(
  region: PsnRegion,
  limit = 100,
): Promise<Array<{ psnProductId: string; storeUrl: string }>> {
  const rows = await sql`
    SELECT psn_product_id, store_url
    FROM psn_regional_products
    WHERE region = ${region}
      AND (description_original_text IS NULL OR rating IS NULL)
    ORDER BY last_seen_at DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    psnProductId: r.psn_product_id as string,
    storeUrl: r.store_url as string,
  }));
}

export async function recordPriceSnapshot(
  regionalProductId: string,
  priceMinor: number | null,
  originalPriceMinor: number | null,
  currencyCode: string | null,
): Promise<void> {
  await sql`
    INSERT INTO psn_price_snapshots
      (psn_regional_product_id, price_minor, original_price_minor, currency_code)
    VALUES
      (${regionalProductId}, ${priceMinor}, ${originalPriceMinor}, ${currencyCode})
  `;
}

// ─── Advisory lock ───────────────────────────────────────────────────────────

// Session-level advisory locks are bound to the physical connection that
// acquired them. With a connection pool, lock and unlock would otherwise land
// on different connections, so we pin a dedicated reserved connection for the
// lock's whole lifetime and run unlock on that same connection.
let lockConnection: Awaited<ReturnType<typeof sql.reserve>> | null = null;

export async function tryAdvisoryLock(): Promise<boolean> {
  if (lockConnection) return false; // already held by this process
  const conn = await sql.reserve();
  try {
    const [row] = await conn`
      SELECT pg_try_advisory_lock(${ADVISORY_LOCK_KEY}) AS acquired
    `;
    if (row.acquired) {
      lockConnection = conn;
      return true;
    }
    conn.release();
    return false;
  } catch (err) {
    conn.release();
    throw err;
  }
}

export async function releaseAdvisoryLock(): Promise<void> {
  if (!lockConnection) return;
  const conn = lockConnection;
  lockConnection = null;
  try {
    await conn`SELECT pg_advisory_unlock(${ADVISORY_LOCK_KEY})`;
  } finally {
    conn.release();
  }
}

// ─── Collections ─────────────────────────────────────────────────────────────

/**
 * Create or re-activate a named collection for a region.
 * Returns the collection's uuid.
 */
export async function upsertCollection(
  nameRu: string,
  region: PsnRegion,
): Promise<string> {
  const [row] = await sql`
    INSERT INTO psn_collections (name_ru, region, is_active)
    VALUES (${nameRu}, ${region}, true)
    ON CONFLICT (name_ru, region) DO UPDATE SET
      is_active  = true,
      updated_at = now()
    RETURNING id
  `;
  return row.id as string;
}

/**
 * Add/update a product's position inside a collection (idempotent).
 */
export async function upsertCollectionItem(
  collectionId: string,
  psn_regional_product_id: string,
  displayRank: number,
): Promise<void> {
  await sql`
    INSERT INTO psn_collection_items (collection_id, psn_regional_product_id, display_rank)
    VALUES (${collectionId}, ${psn_regional_product_id}, ${displayRank})
    ON CONFLICT (collection_id, psn_regional_product_id) DO UPDATE SET
      display_rank = EXCLUDED.display_rank
  `;
}
