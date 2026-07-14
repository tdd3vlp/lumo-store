import { isTopUpCurrency } from "@/lib/products/steam-topup";
import { quoteSteamTopUp } from "@/lib/products/steam-topup-quote";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// This route is public and proxies to NS.gifts (which is IP-limited and metered)
// on every call, so a naive in-memory per-IP throttle guards our whitelisted IP
// from being drained or banned. Per-instance only — good enough as a first line;
// a shared limiter can replace it if we scale horizontally.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_REQUESTS;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Live Steam login validation + top-up quote, mirroring nebula's
 * POST /api/steam/check-login. Body: { login, amount, currency }.
 * Returns { canRefill, amountUsd, priceMinor, min, max, error }.
 */
export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return Response.json({ error: "Слишком много запросов. Подождите немного." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const login = typeof b.login === "string" ? b.login : "";
  const amount = Number(b.amount);
  const currencyRaw = typeof b.currency === "string" ? b.currency : "RUB";
  const currency = isTopUpCurrency(currencyRaw) ? currencyRaw : "RUB";

  if (!login || !Number.isFinite(amount)) {
    return Response.json({ error: "login and amount are required" }, { status: 400 });
  }

  const quote = await quoteSteamTopUp({ login, amount, currency });
  return Response.json(quote);
}
