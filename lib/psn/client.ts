import { createHash } from "node:crypto";
import { ALLOWED_STORE_PREFIXES } from "./types";

const MIN_INTERVAL_MS = 5_000;
const JITTER_MIN_MS = 500;
const JITTER_MAX_MS = 2_000;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const CIRCUIT_OPEN_AFTER = 5;
const CIRCUIT_RESET_MS = 15 * 60_000; // 15 min — block protection, not seconds
const DEFAULT_BLOCK_BACKOFF_MS = 60_000; // wait a minute between 403/429 retries
const DEFAULT_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1_000;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export type FetchResult = {
  html: string;
  statusCode: number;
  fromCache: boolean;
};

type CacheEntry = { body: string; fetchedAt: number };

export type PsnClientErrorCode =
  | "ALLOWLIST"
  | "CIRCUIT_OPEN"
  | "BLOCKED"
  | "REDIRECT"
  | "HTTP"
  | "TIMEOUT"
  | "NETWORK";

// Codes the importer should treat as fatal (abort the whole job, don't continue
// hammering the store): the circuit is open or we've been rate-limited/blocked.
export const FATAL_CLIENT_CODES: ReadonlySet<PsnClientErrorCode> = new Set([
  "CIRCUIT_OPEN",
  "BLOCKED",
]);

export class PsnClientError extends Error {
  constructor(
    message: string,
    public readonly code: PsnClientErrorCode,
  ) {
    super(message);
    this.name = "PsnClientError";
  }
}

export function validateStoreUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new PsnClientError(`Malformed URL: ${url}`, "ALLOWLIST");
  }
  if (parsed.hostname !== "store.playstation.com") {
    throw new PsnClientError(`Hostname not allowed: ${parsed.hostname}`, "ALLOWLIST");
  }
  const allowed = ALLOWED_STORE_PREFIXES.some((prefix) => url.startsWith(prefix));
  if (!allowed) {
    throw new PsnClientError(`URL not in allowlist: ${url}`, "ALLOWLIST");
  }
}

export function bodyHash(body: string): string {
  return createHash("sha256").update(body).digest("hex").slice(0, 16);
}

export class PsnClient {
  private lastRequestAt = 0;
  private consecutiveErrors = 0;
  private consecutiveBlocks = 0;
  private circuitOpenedAt: number | null = null;
  private memCache = new Map<string, CacheEntry>();
  private readonly cacheMaxAgeMs: number;
  private readonly blockBackoffMs: number;

  constructor(opts: { cacheMaxAgeMs?: number; blockBackoffMs?: number } = {}) {
    this.cacheMaxAgeMs = opts.cacheMaxAgeMs ?? DEFAULT_CACHE_MAX_AGE_MS;
    this.blockBackoffMs = opts.blockBackoffMs ?? DEFAULT_BLOCK_BACKOFF_MS;
  }

  private circuitCheck(): void {
    if (this.circuitOpenedAt === null) return;
    const elapsed = Date.now() - this.circuitOpenedAt;
    if (elapsed < CIRCUIT_RESET_MS) {
      const remaining = Math.ceil((CIRCUIT_RESET_MS - elapsed) / 1_000);
      throw new PsnClientError(
        `Circuit breaker open — retry in ${remaining}s`,
        "CIRCUIT_OPEN",
      );
    }
    this.circuitOpenedAt = null;
    this.consecutiveErrors = 0;
  }

  private onError(): void {
    this.consecutiveErrors += 1;
    if (this.consecutiveErrors >= CIRCUIT_OPEN_AFTER) {
      this.circuitOpenedAt = Date.now();
    }
  }

  private onSuccess(): void {
    this.consecutiveErrors = 0;
    this.consecutiveBlocks = 0;
  }

  private async throttle(): Promise<void> {
    const jitter = JITTER_MIN_MS + Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS);
    const minWait = MIN_INTERVAL_MS + jitter;
    const elapsed = Date.now() - this.lastRequestAt;
    const delay = Math.max(0, minWait - elapsed);
    if (delay > 0) await sleep(delay);
    this.lastRequestAt = Date.now();
  }

  async fetch(url: string, opts: { bypassCache?: boolean } = {}): Promise<FetchResult> {
    validateStoreUrl(url);
    this.circuitCheck();

    if (!opts.bypassCache) {
      const hit = this.memCache.get(url);
      if (hit && Date.now() - hit.fetchedAt < this.cacheMaxAgeMs) {
        return { html: hit.body, statusCode: 200, fromCache: true };
      }
    }

    await this.throttle();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await sleep(Math.pow(2, attempt) * 1_000);
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await globalThis.fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
          },
          redirect: "follow",
        });

        clearTimeout(timer);

        // Guard against redirects leaving the allowed domain
        if (response.url) {
          const finalHostname = new URL(response.url).hostname;
          if (finalHostname !== "store.playstation.com") {
            this.onError();
            throw new PsnClientError(
              `Redirected to unexpected host: ${finalHostname}`,
              "REDIRECT",
            );
          }
        }

        // 403/429 are block signals — back off for minutes, and after a few
        // attempts escalate to a fatal BLOCKED error so the job stops instead
        // of hammering the store and deepening the block.
        if (response.status === 429 || response.status === 403) {
          this.consecutiveBlocks += 1;
          this.onError();
          if (attempt >= MAX_RETRIES) {
            throw new PsnClientError(
              `Blocked: HTTP ${response.status} after ${attempt + 1} attempts ` +
                `(${this.consecutiveBlocks} consecutive block responses)`,
              "BLOCKED",
            );
          }
          lastError = new PsnClientError(`HTTP ${response.status} (blocked)`, "BLOCKED");
          await sleep(this.blockBackoffMs * (attempt + 1));
          continue;
        }

        // Retry transient server errors with exponential backoff
        if (response.status >= 500 && response.status < 600) {
          lastError = new PsnClientError(`HTTP ${response.status}`, "HTTP");
          this.onError();
          continue;
        }

        if (!response.ok) {
          this.onError();
          throw new PsnClientError(`HTTP ${response.status} for ${url}`, "HTTP");
        }

        const html = await response.text();
        this.onSuccess();
        this.memCache.set(url, { body: html, fetchedAt: Date.now() });
        return { html, statusCode: response.status, fromCache: false };
      } catch (err) {
        clearTimeout(timer);
        if (err instanceof PsnClientError) throw err;
        const name = (err as Error).name;
        if (name === "AbortError") {
          lastError = new PsnClientError(`Timeout fetching ${url}`, "TIMEOUT");
        } else {
          lastError = new PsnClientError((err as Error).message, "NETWORK");
        }
        this.onError();
      }
    }

    throw lastError ?? new PsnClientError(`Failed to fetch ${url}`, "NETWORK");
  }

  get circuitIsOpen(): boolean {
    if (this.circuitOpenedAt === null) return false;
    return Date.now() - this.circuitOpenedAt < CIRCUIT_RESET_MS;
  }

  get stats() {
    return {
      consecutiveErrors: this.consecutiveErrors,
      circuitIsOpen: this.circuitIsOpen,
      circuitOpenedAt: this.circuitOpenedAt,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
