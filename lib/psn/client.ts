import { ALLOWED_STORE_PREFIXES } from "./types";

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
