import { checkTelegramUsername } from "@/lib/products/telegram-stars-quote";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public route that fetches an external page (t.me) per call. A naive per-IP
// throttle keeps a single keystroke-happy client from hammering it. Per-instance
// only — same first-line guard as /api/steam/check-login.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 40;
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
 * Live Telegram username validation. Body: { username }. Returns
 * { valid, exists, error } — `exists` is a best-effort t.me resolution
 * (true / false / null when undetermined).
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

  const username = typeof (body as Record<string, unknown>)?.username === "string"
    ? ((body as Record<string, unknown>).username as string)
    : "";
  if (!username) {
    return Response.json({ error: "username is required" }, { status: 400 });
  }

  const result = await checkTelegramUsername(username);
  return Response.json(result);
}
