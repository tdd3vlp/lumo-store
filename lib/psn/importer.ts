// NOTE: not `server-only` — also imported by scripts/psn/worker.ts under tsx.
import {
  FATAL_CLIENT_CODES,
  PsnClient,
  PsnClientError,
  validateStoreUrl,
} from "./client";
import {
  PsnBrowserClient,
  extractCategoryId,
  regionFromCategoryUrl,
} from "./browser-client";
import { parseCategoryGQL, parseProduct } from "./parser";
import {
  appendEvent,
  getStagedJobMeta,
  getStagedProducts,
  listProductsNeedingRuDescription,
  recordPriceSnapshot,
  releaseAdvisoryLock,
  requeueJob,
  saveStagedProducts,
  setRuDescription,
  tryAdvisoryLock,
  updateJob,
  upsertCategoryProduct,
  upsertCollection,
  upsertCollectionItem,
} from "./db";
import type { ImportJobOptions, ParsedCategoryProduct, PsnRegion } from "./types";
import { buildProductUrl } from "./urls";

export type DryRunResult = {
  url: string;
  pageType: "category" | "product";
  products: Array<{
    psnProductId: string;
    name: string;
    priceMinor: number | null;
    currencyCode: string | null;
  }>;
  parseError: string | null;
};

function isFatalClientError(err: unknown): boolean {
  return err instanceof PsnClientError && FATAL_CLIENT_CODES.has(err.code);
}

// ─── Dry-run: parse one URL without writing to DB ────────────────────────────

export async function dryRunUrl(url: string): Promise<DryRunResult> {
  validateStoreUrl(url);

  const isProduct = url.includes("/product/");
  if (isProduct) {
    // Product detail via GQL is not yet implemented — return a clear message.
    return {
      url,
      pageType: "product",
      products: [],
      parseError: "Product detail not yet supported via GraphQL (category import works)",
    };
  }

  const browser = new PsnBrowserClient();
  try {
    await browser.launch();
    await browser.initSession(url);
    const region = regionFromCategoryUrl(url);
    const grid = await browser.fetchCategoryPage(1);
    const products = parseCategoryGQL(grid, region);
    return {
      url,
      pageType: "category",
      products: products.map((p) => ({
        psnProductId: p.psnProductId,
        name: p.name,
        priceMinor: p.priceMinor,
        currencyCode: p.currencyCode,
      })),
      parseError: null,
    };
  } catch (err) {
    return {
      url,
      pageType: "category",
      products: [],
      parseError: (err as Error).message,
    };
  } finally {
    await browser.close();
  }
}

// ─── Full import job ──────────────────────────────────────────────────────────

export async function runImportJob(
  jobId: string,
  opts: ImportJobOptions & { throwOnLockFailure?: boolean },
): Promise<void> {
  const acquired = await tryAdvisoryLock();
  if (!acquired) {
    if (opts.throwOnLockFailure) {
      throw new Error(
        "Another import is already running. Wait for it to finish before starting a new sync.",
      );
    }
    // Worker mode: hand the job back to pending so the daemon picks it up later.
    await appendEvent(jobId, {
      type: "warning",
      message: "Another import is running; re-queued for later",
    }).catch(() => undefined);
    await requeueJob(jobId);
    return;
  }

  const browser = new PsnBrowserClient();
  try {
    await updateJob(jobId, { status: "running", startedAt: new Date() });
    await appendEvent(jobId, { type: "info", message: "Import started — launching browser" });

    await browser.launch();
    const firstPageUrl = opts.categoryUrl; // always points to page 1
    await browser.initSession(firstPageUrl);
    await appendEvent(jobId, { type: "info", message: "Browser session established (Akamai OK)" });

    const categoryId = extractCategoryId(opts.categoryUrl);
    const region = opts.region;

    // If a collection name is provided, ensure the collection row exists.
    let collectionId: string | null = null;
    if (!opts.dryRun && opts.collectionName) {
      collectionId = await upsertCollection(opts.collectionName, region);
      await appendEvent(jobId, {
        type: "info",
        message: `Collection "${opts.collectionName}" ready (id ${collectionId})`,
      });
    }

    let pagesFetched = 0;
    let productsSeen = 0;
    let productsUpserted = 0;
    const stagedAccum: Array<ParsedCategoryProduct & { salesRank: number }> = [];

    for (let page = opts.pageFrom; page <= opts.pageTo; page++) {
      await appendEvent(jobId, {
        type: "page",
        message: `Fetching page ${page} of ${opts.pageTo}`,
        payload: { categoryId, page },
      });

      let grid;
      try {
        grid = await browser.fetchCategoryPage(page);
        await appendEvent(jobId, {
          type: "info",
          message: `Page ${page}: ${grid.products.length} products (total ${grid.pageInfo.totalCount})`,
          payload: { totalCount: grid.pageInfo.totalCount, isLast: grid.pageInfo.isLast },
        });
      } catch (err) {
        const msg = (err as Error).message;
        if (isFatalClientError(err)) throw err;
        await appendEvent(jobId, {
          type: "warning",
          message: `Page ${page}: fetch failed — ${msg}`,
        });
        continue;
      }

      pagesFetched += 1;

      const products = parseCategoryGQL(grid, region);
      const rankOffset =
        grid.pageInfo.offset || (page - 1) * Math.max(grid.pageInfo.size, 1);

      await appendEvent(jobId, {
        type: "page",
        message: `Page ${page}: ${products.length} products parsed`,
        payload: { count: products.length },
      });

      for (const [productIndex, product] of products.entries()) {
        productsSeen += 1;

        const salesRank = rankOffset + productIndex + 1;

        if (!opts.dryRun) {
          try {
            const { id: regionalProductId } = await upsertCategoryProduct(
              opts.region,
              opts.categoryUrl,
              product,
              { salesRank, saleEndDate: opts.saleEndDate ?? null },
            );
            await recordPriceSnapshot(
              regionalProductId,
              product.priceMinor,
              product.originalPriceMinor,
              product.currencyCode,
            );
            if (collectionId) {
              await upsertCollectionItem(collectionId, regionalProductId, salesRank);
            }
            productsUpserted += 1;
          } catch (err) {
            await appendEvent(jobId, {
              type: "warning",
              message: `Upsert failed for ${product.psnProductId}: ${(err as Error).message}`,
            });
          }
        } else {
          stagedAccum.push({ ...product, salesRank });
          productsUpserted += 1;
        }

        await appendEvent(jobId, {
          type: "product",
          message: `${product.name} (${product.psnProductId})`,
          payload: {
            psnProductId: product.psnProductId,
            name: product.name,
            priceMinor: product.priceMinor,
            currencyCode: product.currencyCode,
          },
        });
      }

      // Persist running counters + bump updated_at for heartbeat lease.
      await updateJob(jobId, { pagesFetched, productsSeen, productsUpserted });

      // Stop early if the grid says we've reached the last page.
      if (grid.pageInfo.isLast) break;
    }

    if (opts.dryRun && stagedAccum.length > 0) {
      await saveStagedProducts(jobId, stagedAccum);
    }

    await updateJob(jobId, {
      status: "done",
      pagesFetched,
      productsSeen,
      productsUpserted,
      finishedAt: new Date(),
    });
    await appendEvent(jobId, {
      type: "done",
      message: `Done — ${productsUpserted} products${opts.dryRun ? " (dry-run, staged for commit)" : " upserted"}`,
      payload: { pagesFetched, productsSeen, productsUpserted },
    });
  } catch (err) {
    const msg = (err as Error).message;
    await updateJob(jobId, {
      status: "failed",
      errorMessage: msg,
      finishedAt: new Date(),
    });
    await appendEvent(jobId, { type: "error", message: `Fatal: ${msg}` }).catch(() => undefined);
  } finally {
    await browser.close().catch(() => undefined);
    await releaseAdvisoryLock().catch(() => undefined);
  }
}

// ─── Commit staged dry-run ───────────────────────────────────────────────────

export type CommitStagedOptions = {
  stagedJobId: string;
  saleEndDate?: string | null;
  collectionName?: string | null;
};

export async function commitStagedJob(
  jobId: string,
  opts: CommitStagedOptions,
): Promise<void> {
  const staged = await getStagedProducts(opts.stagedJobId);
  if (!staged || staged.length === 0) {
    throw new Error(`No staged products found for job ${opts.stagedJobId}`);
  }

  const meta = await getStagedJobMeta(opts.stagedJobId);
  if (!meta) {
    throw new Error(`Staged job ${opts.stagedJobId} not found or not a completed dry run`);
  }

  const acquired = await tryAdvisoryLock();
  if (!acquired) {
    await requeueJob(jobId);
    return;
  }

  try {
    await updateJob(jobId, { status: "running", startedAt: new Date() });
    await appendEvent(jobId, {
      type: "info",
      message: `Committing ${staged.length} staged products from dry-run job ${opts.stagedJobId.slice(0, 8)}…`,
    });

    let collectionId: string | null = null;
    if (opts.collectionName) {
      collectionId = await upsertCollection(opts.collectionName, meta.region);
      await appendEvent(jobId, {
        type: "info",
        message: `Collection "${opts.collectionName}" ready (id ${collectionId})`,
      });
    }

    const saleEndDate = opts.saleEndDate ?? meta.saleEndDate ?? null;
    let productsUpserted = 0;

    for (const product of staged) {
      try {
        const { id: regionalProductId } = await upsertCategoryProduct(
          meta.region,
          meta.categoryUrl,
          product,
          { salesRank: product.salesRank, saleEndDate },
        );
        await recordPriceSnapshot(
          regionalProductId,
          product.priceMinor,
          product.originalPriceMinor,
          product.currencyCode,
        );
        if (collectionId) {
          await upsertCollectionItem(collectionId, regionalProductId, product.salesRank);
        }
        productsUpserted += 1;
        await appendEvent(jobId, {
          type: "product",
          message: `${product.name} (${product.psnProductId})`,
        });
      } catch (err) {
        await appendEvent(jobId, {
          type: "warning",
          message: `Upsert failed for ${product.psnProductId}: ${(err as Error).message}`,
        });
      }
    }

    await updateJob(jobId, {
      status: "done",
      pagesFetched: 0,
      productsSeen: staged.length,
      productsUpserted,
      finishedAt: new Date(),
    });
    await appendEvent(jobId, {
      type: "done",
      message: `Committed ${productsUpserted} products from staged dry-run`,
      payload: { productsUpserted, fromJob: opts.stagedJobId },
    });
  } catch (err) {
    const msg = (err as Error).message;
    await updateJob(jobId, { status: "failed", errorMessage: msg, finishedAt: new Date() });
    await appendEvent(jobId, { type: "error", message: `Fatal: ${msg}` }).catch(() => undefined);
  } finally {
    await releaseAdvisoryLock().catch(() => undefined);
  }
}

// ─── RU description pass ──────────────────────────────────────────────────────

/**
 * Attach Russian descriptions to the IN/TR card rows that need them.
 *
 * The RU text is written onto the *source* region's row (IN/TR), not a UA row —
 * `description_ru_*` lives on the same product the storefront renders.
 *
 * KNOWN LIMITATION: PS Store product IDs frequently differ across regions, so a
 * full solution must discover the UA product by `np_title_id` (via the ru-ua
 * search). That search isn't implemented yet; this pass makes a best-effort
 * attempt with the same product ID on /ru-ua/ and, on any failure, leaves
 * `description_ru` NULL rather than guessing. Wire up np_title_id-based UA
 * discovery before relying on this for coverage.
 */
export async function enrichRuDescriptions(
  jobId: string,
  region: PsnRegion,
  limit = 50,
): Promise<void> {
  const targets = await listProductsNeedingRuDescription(region, limit);

  await appendEvent(jobId, {
    type: "info",
    message: `RU enrichment: ${targets.length} ${region} products need descriptions`,
  });

  const client = new PsnClient();
  let saved = 0;
  let missed = 0;

  for (const target of targets) {
    // Best-effort: try the same product ID under /ru-ua/. See limitation above.
    const url = buildProductUrl("UA", target.psnProductId);

    try {
      const { html } = await client.fetch(url);
      const detail = parseProduct(html);
      const ok = await setRuDescription(
        region,
        target.psnProductId,
        detail.longDescriptionHtml,
        detail.longDescriptionText,
      );
      if (ok && detail.longDescriptionText) {
        saved += 1;
        await appendEvent(jobId, {
          type: "product",
          message: `RU description saved for ${region}/${target.psnProductId}`,
        });
      } else {
        missed += 1;
      }
    } catch (err) {
      // Fatal block/circuit → stop the pass; otherwise leave RU null and move on.
      if (isFatalClientError(err)) {
        await appendEvent(jobId, {
          type: "error",
          message: `RU enrichment aborted (blocked): ${(err as Error).message}`,
        });
        throw err;
      }
      missed += 1;
      await appendEvent(jobId, {
        type: "warning",
        message: `No RU description for ${target.psnProductId} (left empty): ${(err as Error).message}`,
      });
    }
  }

  await appendEvent(jobId, {
    type: "info",
    message: `RU enrichment done — saved ${saved}, left empty ${missed}`,
    payload: { saved, missed },
  });
}
