import { type ClientSignals, EMPTY_SIGNALS } from "./types";

// Browser-side collector for the audit signals. The "browser fingerprint" is a
// homemade SHA-256 over stable browser characteristics (WebCrypto, no external
// dependency). The session id is generated once per page load and kept in memory
// only — it is never written to localStorage/sessionStorage/URL, matching the
// no-persistence rule for anything code-related.

let cachedSessionId: string | null = null;
let lastSignals: ClientSignals | null = null;

export function pageSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  cachedSessionId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return cachedSessionId;
}

async function sha256Hex(input: string): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const data = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}

export async function collectSignals(): Promise<ClientSignals> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { ...EMPTY_SIGNALS, sessionId: pageSessionId() };
  }

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    platform?: string;
  };

  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  const screenResolution =
    typeof window.screen !== "undefined"
      ? `${window.screen.width}x${window.screen.height}`
      : null;
  const platform =
    typeof nav.platform === "string" && nav.platform ? nav.platform : null;
  const deviceMemory =
    typeof nav.deviceMemory === "number" ? String(nav.deviceMemory) : null;
  const hardwareConcurrency =
    typeof nav.hardwareConcurrency === "number" ? nav.hardwareConcurrency : null;

  const fingerprintSource = [
    nav.userAgent,
    platform,
    timezone,
    screenResolution,
    nav.language,
    Array.isArray(nav.languages) ? nav.languages.join(",") : "",
    deviceMemory,
    hardwareConcurrency,
  ].join("|");
  const browserFingerprint = await sha256Hex(fingerprintSource);

  lastSignals = {
    timezone,
    screenResolution,
    platform,
    deviceMemory,
    hardwareConcurrency,
    browserFingerprint,
    sessionId: pageSessionId(),
  };
  return lastSignals;
}

/** Last collected signals, synchronously — for beacons fired during page unload
 *  where awaiting the async collector isn't reliable. */
export function cachedSignals(): ClientSignals {
  return lastSignals ?? { ...EMPTY_SIGNALS, sessionId: pageSessionId() };
}
