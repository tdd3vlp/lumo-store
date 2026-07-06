/**
 * Playwright-based PS Store client.
 *
 * PS Store renders product data server-side into __NEXT_DATA__ (props.apolloState).
 * The page is protected by Akamai Bot Manager, so a real Chromium browser is
 * required to pass the JS challenge and receive the SSR HTML. Once we have the
 * HTML, data is extracted from __NEXT_DATA__ without any additional network
 * requests — no GraphQL calls, no DOM evaluation, no stealth plugins.
 *
 * If Akamai returns 403/429 or the __NEXT_DATA__ structure is missing, the job
 * stops via the existing BLOCKED/circuit-breaker error path.
 *
 * Lifecycle: launch() once per job, fetchCategoryPage() for each page,
 * close() in a finally block.
 */

import { LOCALE_BY_REGION } from "./types";
import type { PsnRegion } from "./types";
import { PsnClientError } from "./client";

const MIN_INTERVAL_MS = 5_000;
const JITTER_MS = 1_500;
const NAVIGATION_TIMEOUT_MS = 30_000;

export const CATEGORY_PAGE_SIZE = 24;

export type GQLPrice = {
  basePrice: string | null;
  discountedPrice: string | null;
  isFree: boolean;
};

export type GQLMediaItem = { type: string; url: string; role: string };

export const GAME_CLASSIFICATIONS = new Set([
  "FULL_GAME",
  "GAME_BUNDLE",
  "PREMIUM_EDITION",
]);

export type GQLProduct = {
  id: string;
  name: string;
  npTitleId: string | null;
  platforms: string[];
  price: GQLPrice | null;
  media: GQLMediaItem[];
  storeDisplayClassification: string | null;
};

export type GQLPageInfo = {
  totalCount: number;
  offset: number;
  size: number;
  isLast: boolean;
};

export type GQLCategoryPage = {
  pageInfo: GQLPageInfo;
  products: GQLProduct[];
};

export const CURRENCY_BY_REGION: Record<PsnRegion, string> = {
  TR: "TRY",
  UA: "UAH",
};

// ─── __NEXT_DATA__ parsing ────────────────────────────────────────────────────

const NEXT_DATA_RE = /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

function parseNextDataApolloState(html: string): {
  apolloState: Record<string, unknown>;
} {
  const match = NEXT_DATA_RE.exec(html);
  if (!match?.[1]) {
    throw new PsnClientError("__NEXT_DATA__ not found in page HTML", "HTTP");
  }
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    throw new PsnClientError("Failed to JSON-parse __NEXT_DATA__", "HTTP");
  }
  const props = data.props as Record<string, unknown> | undefined;
  const apolloState = props?.apolloState as Record<string, unknown> | undefined;
  if (!apolloState || typeof apolloState !== "object") {
    throw new PsnClientError(
      "props.apolloState missing from __NEXT_DATA__ — page may not have loaded",
      "HTTP",
    );
  }
  return { apolloState };
}

function apolloStateToGQLPage(apolloState: Record<string, unknown>): GQLCategoryPage {
  const gridEntry = Object.entries(apolloState).find(([k]) =>
    k.startsWith("CategoryGrid:"),
  );
  if (!gridEntry) {
    throw new PsnClientError(
      "CategoryGrid not found in apolloState — category page may not have loaded",
      "HTTP",
    );
  }
  const grid = gridEntry[1] as Record<string, unknown>;
  const pageInfo = grid.pageInfo as GQLPageInfo | undefined;
  if (typeof pageInfo?.totalCount !== "number") {
    throw new PsnClientError(
      "pageInfo.totalCount missing from CategoryGrid",
      "HTTP",
    );
  }

  const productRefs =
    (grid.products as Array<{ __ref: string } | null>) ?? [];

  const products: GQLProduct[] = productRefs.flatMap((ref) => {
    if (!ref?.__ref) return [];
    // Key format: "Product:<id>:<locale>"  (locale may be absent on older pages)
    const p = apolloState[ref.__ref] as Record<string, unknown> | undefined;
    if (!p) return [];

    const rawPrice = p.price as Record<string, unknown> | null | undefined;
    const price: GQLPrice | null = rawPrice
      ? {
          basePrice: (rawPrice.basePrice as string) ?? null,
          discountedPrice: (rawPrice.discountedPrice as string) ?? null,
          isFree: (rawPrice.isFree as boolean) ?? false,
        }
      : null;

    const media = (p.media as GQLMediaItem[]) ?? [];

    return [
      {
        id: p.id as string,
        name: p.name as string,
        npTitleId: (p.npTitleId as string) ?? null,
        platforms: (p.platforms as string[]) ?? [],
        price,
        media,
        storeDisplayClassification:
          (p.storeDisplayClassification as string) ?? null,
      },
    ];
  });

  // Collection categories use a Concept-based layout: CategoryGrid.concepts[]
  // instead of CategoryGrid.products[]. Each Concept has name/media and refs
  // to Product stubs (price not SSR'd — existing snapshots provide it).
  if (products.length === 0) {
    const conceptRefs =
      (grid.concepts as Array<{ __ref: string } | null>) ?? [];

    for (const conceptRef of conceptRefs) {
      if (!conceptRef?.__ref) continue;
      const concept = apolloState[conceptRef.__ref] as Record<string, unknown> | undefined;
      if (!concept) continue;

      const name = concept.name as string | undefined;
      if (!name) continue;

      const media = (concept.media as GQLMediaItem[]) ?? [];

      // One card per Concept. Pick the first non-demo product ref.
      const conceptProductRefs =
        (concept.products as Array<{ __ref: string } | null>) ?? [];
      const isDemo = (ref: string) => ref.toUpperCase().includes("DEMO");
      const bestRef =
        conceptProductRefs.find((r) => r?.__ref && !isDemo(r.__ref)) ??
        conceptProductRefs[0];
      if (!bestRef?.__ref) continue;
      const stub = apolloState[bestRef.__ref] as Record<string, unknown> | undefined;
      const productId = (stub?.id ?? bestRef.__ref.split(":")[1]) as string | undefined;
      if (!productId) continue;

      products.push({
        id: productId,
        name,
        npTitleId: null,
        platforms: [],
        price: null, // not SSR'd for collection categories; existing snapshots fill in
        media,
        storeDisplayClassification: "FULL_GAME",
      });
    }
  }

  return {
    pageInfo: {
      totalCount: pageInfo.totalCount,
      offset: pageInfo.offset ?? 0,
      size: pageInfo.size ?? CATEGORY_PAGE_SIZE,
      isLast: pageInfo.isLast ?? true,
    },
    products,
  };
}

// ─── Browser client ───────────────────────────────────────────────────────────

export class PsnBrowserClient {
  private browser: import("playwright").Browser | null = null;
  private context: import("playwright").BrowserContext | null = null;
  private sessionPage: import("playwright").Page | null = null;
  private detailPage: import("playwright").Page | null = null;
  private categoryBaseUrl: string | null = null;
  private currentPageNum = 0;
  private lastRequestAt = 0;
  private sessionCookies: string | null = null;

  async launch(): Promise<void> {
    const { chromium } = await import("playwright");
    this.browser = await chromium.launch({ headless: true });
    this.context = await this.browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      locale: "en-US",
      viewport: { width: 1280, height: 800 },
    });
  }

  /**
   * Navigate to the first category page so Akamai's JS challenge runs and
   * sets a validated _abck cookie. The page-1 HTML is retained in sessionPage
   * so fetchCategoryPage(1) can extract data without re-navigating.
   */
  async initSession(firstPageUrl: string): Promise<void> {
    if (!this.context) throw new Error("Browser not launched — call launch() first");
    if (this.sessionPage) {
      await this.sessionPage.close().catch(() => {});
    }
    this.sessionPage = await this.context.newPage();
    try {
      await this.sessionPage.goto(firstPageUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      // Allow Akamai JS ~2s to finish before we read content().
      await this.sessionPage.waitForTimeout(2_000);
    } catch (err) {
      await this.sessionPage.close().catch(() => {});
      this.sessionPage = null;
      throw new PsnClientError(
        `Navigation failed: ${(err as Error).message}`,
        "NETWORK",
      );
    }
    // Strip trailing page number from the path, preserving query string.
    const parsedUrl = new URL(firstPageUrl);
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/\d+$/, "");
    this.categoryBaseUrl = parsedUrl.toString(); // includes query string if any
    this.currentPageNum = 1;
    this.lastRequestAt = Date.now();

    // Extract Akamai cookies — reused for direct HTTP product-detail fetches
    const cookies = await this.context!.cookies("https://store.playstation.com");
    this.sessionCookies = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  }

  private async throttle(): Promise<void> {
    const jitter = Math.random() * JITTER_MS;
    const wait = Math.max(
      0,
      MIN_INTERVAL_MS + jitter - (Date.now() - this.lastRequestAt),
    );
    if (wait > 0) await sleep(wait);
    this.lastRequestAt = Date.now();
  }

  /**
   * Extract one page of a category grid from __NEXT_DATA__ embedded in the
   * SSR HTML.  For page 1, the page loaded by initSession() is reused.
   * For subsequent pages, we navigate to `${baseUrl}/${pageNum}`.
   *
   * Throws PsnClientError("BLOCKED") on HTTP 403/429 navigation failures,
   * matching the existing contract so runImportJob aborts via FATAL_CLIENT_CODES.
   */
  async fetchCategoryPage(pageNum: number): Promise<GQLCategoryPage> {
    if (!this.sessionPage || !this.categoryBaseUrl) {
      throw new Error("Session not initialized — call initSession() first");
    }

    if (this.currentPageNum !== pageNum) {
      await this.throttle();
      const u = new URL(this.categoryBaseUrl);
      u.pathname = `${u.pathname}/${pageNum}`;
      const pageUrl = u.toString();
      try {
        const response = await this.sessionPage.goto(pageUrl, {
          waitUntil: "domcontentloaded",
          timeout: NAVIGATION_TIMEOUT_MS,
        });
        const status = response?.status() ?? 0;
        if (status === 403 || status === 429) {
          throw new PsnClientError(
            `Category page ${pageNum} blocked: HTTP ${status}`,
            "BLOCKED",
          );
        }
        // Short wait for Akamai JS to finish writing cookies before content().
        await this.sessionPage.waitForTimeout(1_000);
      } catch (err) {
        if (err instanceof PsnClientError) throw err;
        throw new PsnClientError(
          `Navigation failed on page ${pageNum}: ${(err as Error).message}`,
          "NETWORK",
        );
      }
      this.currentPageNum = pageNum;
      this.lastRequestAt = Date.now();
    }

    const html = await this.sessionPage.content();

    const { apolloState } = parseNextDataApolloState(html);
    return apolloStateToGQLPage(apolloState);
  }

  /**
   * Fetch a product detail page via the browser's HTTP stack (no page render).
   *
   * Uses Playwright's APIRequestContext (Chrome's network stack) — correct TLS
   * fingerprint, browser UA, and Akamai session cookies from initSession().
   * No JS execution needed — enrichment data (descriptions, genres, languages,
   * rating, screenshots) is already present in WCA script tags in the SSR HTML.
   * ~5-10× faster than a full page load.
   */
  async fetchProductDetail(productUrl: string): Promise<WCAProductData> {
    if (!this.context) {
      throw new Error("Browser not launched — call launch() first");
    }
    if (!this.sessionCookies) {
      throw new Error("No session — call initSession() first");
    }

    await this.throttle();

    const resp = await this.context.request.get(productUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://store.playstation.com/",
      },
    });

    this.lastRequestAt = Date.now();

    if (resp.status() === 403 || resp.status() === 429) {
      throw new PsnClientError(
        `Product page blocked: HTTP ${resp.status()} — ${productUrl}`,
        "BLOCKED",
      );
    }
    if (!resp.ok()) {
      throw new PsnClientError(
        `Product fetch failed: HTTP ${resp.status()} — ${productUrl}`,
        "HTTP",
      );
    }

    const html = await resp.text();
    return parseProductDetailHtml(html);
  }

  async close(): Promise<void> {
    await this.sessionPage?.close().catch(() => {});
    await this.detailPage?.close().catch(() => {});
    await this.context?.close().catch(() => {});
    await this.browser?.close().catch(() => {});
    this.sessionPage = null;
    this.detailPage = null;
    this.context = null;
    this.browser = null;
    this.categoryBaseUrl = null;
    this.currentPageNum = 0;
  }
}

// ─── Product detail data ──────────────────────────────────────────────────────

export type WCAProductData = {
  id: string;
  name: string;
  longDescriptionHtml: string | null;
  publisher: string | null;
  releaseDate: string | null;
  platforms: string[];
  genres: string[];
  voiceLanguages: string[];
  subtitleLanguages: string[];
  rating: number | null;
  ratingsCount: number | null;
  screenshotUrls: string[];
};

// Roles that represent in-game screenshots (not promotional art)
const SCREENSHOT_ROLES = new Set(["SCREENSHOT", "PREVIEW_VIDEO_SCREENSHOT"]);
// Roles to skip when looking for screenshots
const PROMO_ROLES = new Set([
  "MASTER", "PORTRAIT_BANNER", "GAMEHUB_COVER_ART", "LOGO",
  "HERO_CHARACTER", "BACKGROUND_LAYER_ART", "FOUR_BY_THREE_BANNER",
  "BACKGROUND", "EDITION_KEY_ART",
]);

/**
 * Parse product detail data from a PS Store product page HTML.
 *
 * Reads from __NEXT_DATA__ (SSR Apollo cache) — all enrichment fields
 * (description, genres, languages, rating, screenshots) are present in
 * the initial HTML without needing JavaScript to run.
 *
 * Apollo normalized cache stores related objects as {__ref: "TypeName:id"}
 * references. We resolve them against the full apolloState map so callers
 * get plain values, not stubs.
 */
export function parseProductDetailHtml(html: string): WCAProductData {
  const merged: Record<string, unknown> = {};
  let apolloState: Record<string, unknown> = {};

  // Primary source: __NEXT_DATA__ apolloState (SSR — may have minimal data)
  const ndMatch = NEXT_DATA_RE.exec(html);
  if (ndMatch?.[1]) {
    try {
      const data = JSON.parse(ndMatch[1]) as Record<string, unknown>;
      apolloState = ((data.props as Record<string, unknown>)?.apolloState as
        | Record<string, unknown>
        | undefined) ?? {};
      for (const [key, val] of Object.entries(apolloState)) {
        if (key.startsWith("Product:") && val && typeof val === "object") {
          Object.assign(merged, val as Record<string, unknown>);
        }
      }
    } catch { /* fall through */ }
  }

  // Always also check WCA/Apollo script tags — after JS runs, these contain the
  // full Apollo client cache with enrichment data (descriptions, genres, rating,
  // languages). Even when __NEXT_DATA__ already provided the product id, the WCA
  // tags have the complete data that __NEXT_DATA__ SSR may have omitted.
  const WCA_JSON_RE = /<script[^>]+type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
  for (const match of html.matchAll(WCA_JSON_RE)) {
    try {
      const blob = JSON.parse(match[1]) as Record<string, unknown>;
      const cache = blob.cache as Record<string, unknown> | undefined;
      if (!cache) continue;
      for (const [key, val] of Object.entries(cache)) {
        if (key.startsWith("Product:") && val && typeof val === "object") {
          Object.assign(merged, val as Record<string, unknown>);
        }
      }
      // Also update apolloState for __ref resolution
      Object.assign(apolloState, cache);
    } catch { /* skip */ }
  }

  if (!merged.id) {
    throw new PsnClientError(
      "No Product data found in page HTML",
      "HTTP",
    );
  }

  // Apollo __ref resolver: if a value is {__ref: "Key"}, look it up in apolloState
  function deref<T>(val: unknown): T | null {
    if (val === null || val === undefined) return null;
    if (typeof val === "object" && "__ref" in (val as Record<string, unknown>)) {
      return (apolloState[(val as Record<string, unknown>).__ref as string] as T) ?? null;
    }
    return val as T;
  }

  // descriptions — may be [{__ref}] or [{type, value}] or already on merged obj
  const rawDescs = (merged.descriptions as Array<unknown>) ?? [];
  const descriptions = rawDescs
    .map((d) => deref<{ type: string; value: string }>(d))
    .filter((d): d is { type: string; value: string } => !!d);
  const longDesc = descriptions.find((d) => d.type === "LONG")?.value ?? null;

  // starRating — may be {__ref} or {averageRating, totalRatingsCount}
  const rawStarRating = merged.starRating;
  const starRating = deref<{ averageRating?: number; totalRatingsCount?: number }>(rawStarRating);

  // localizedGenres — may be [{__ref}] or [{value}]
  const rawGenres = (merged.localizedGenres as Array<unknown>) ?? [];
  const genres = rawGenres
    .map((g) => deref<{ value?: string }>(g)?.value ?? null)
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  // Screenshots: explicit SCREENSHOT role first, then any IMAGE not in promo set
  const mediaItems = (merged.media as Array<{ type: string; role: string; url: string }>) ?? [];
  const explicitScreenshots = mediaItems
    .filter((m) => m.type === "IMAGE" && SCREENSHOT_ROLES.has(m.role))
    .map((m) => m.url);
  const implicitScreenshots = mediaItems
    .filter((m) => m.type === "IMAGE" && !PROMO_ROLES.has(m.role) && !SCREENSHOT_ROLES.has(m.role))
    .map((m) => m.url);
  const screenshotUrls = explicitScreenshots.length > 0
    ? explicitScreenshots
    : implicitScreenshots.slice(0, 8);

  return {
    id: merged.id as string,
    name: (merged.name as string) ?? "",
    longDescriptionHtml: longDesc,
    publisher: (merged.publisherName as string) ?? null,
    releaseDate: (merged.releaseDate as string) ?? null,
    platforms: (merged.platforms as string[]) ?? [],
    genres,
    voiceLanguages: (merged.spokenLanguages as string[]) ?? [],
    subtitleLanguages: (merged.screenLanguages as string[]) ?? [],
    rating: starRating?.averageRating ?? null,
    ratingsCount: starRating?.totalRatingsCount ?? null,
    screenshotUrls,
  };
}

/** @deprecated Use parseProductDetailHtml — kept for backward compat */
export const parseWCAProductData = parseProductDetailHtml;

/**
 * Extract the UUID category ID from a PS Store category URL.
 * https://store.playstation.com/en-tr/category/<uuid>/1 → <uuid>
 */
export function extractCategoryId(categoryUrl: string): string {
  const url = new URL(categoryUrl);
  const segs = url.pathname.split("/").filter(Boolean);
  const idx = segs.indexOf("category");
  if (idx === -1 || !segs[idx + 1]) {
    throw new Error(`Cannot extract category ID from URL: ${categoryUrl}`);
  }
  return segs[idx + 1];
}

/**
 * Derive the PSN region enum from the locale in a PS Store URL.
 * https://store.playstation.com/en-tr/... → "TR"
 */
export function regionFromCategoryUrl(categoryUrl: string): PsnRegion {
  const url = new URL(categoryUrl);
  const locale = url.pathname.split("/").find((s) => s.includes("-")) ?? "";
  for (const [region, loc] of Object.entries(LOCALE_BY_REGION) as [
    PsnRegion,
    string,
  ][]) {
    if (locale === loc) return region;
  }
  // Legacy alias: PS Store Turkey used "tr-tr" before switching to "en-tr".
  if (locale === "tr-tr") return "TR";
  throw new Error(
    `Cannot determine region from URL locale "${locale}": ${categoryUrl}`,
  );
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
