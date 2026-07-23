import { clientIp } from "@/lib/rate-limit";
import {
  type ClientSignals,
  EMPTY_SIGNALS,
  type RequestContext,
} from "./types";

// Middleware-style helpers that turn a raw Request into the audit inputs:
//  - server-trusted signals from proxy/browser headers (RequestContext)
//  - browser-collected signals parsed defensively from the JSON body

/** Read IP / User-Agent / Referer / Accept-Language from the request headers. */
export function requestContextFrom(request: Request): RequestContext {
  const ip = clientIp(request);
  return {
    ip: ip === "unknown" ? null : ip,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    acceptLanguage: request.headers.get("accept-language"),
  };
}

function str(value: unknown, max = 512): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function intOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Parse the optional `signals` object a client sends. All fields are optional
 *  and untrusted, so every one is coerced/bounded and defaults to null. */
export function clientSignalsFrom(value: unknown): ClientSignals {
  if (!value || typeof value !== "object") return { ...EMPTY_SIGNALS };
  const s = value as Record<string, unknown>;
  return {
    timezone: str(s.timezone, 64),
    screenResolution: str(s.screenResolution, 32),
    platform: str(s.platform, 128),
    deviceMemory: str(s.deviceMemory, 16),
    hardwareConcurrency: intOrNull(s.hardwareConcurrency),
    browserFingerprint: str(s.browserFingerprint, 128),
    sessionId: str(s.sessionId, 64),
  };
}
