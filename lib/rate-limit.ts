// Per-instance, in-memory sliding-window rate limiter keyed by client IP. Good
// enough as a first line for public endpoints that proxy to a metered upstream
// or send email; per-process only (state resets on deploy and isn't shared
// across instances), so swap for a shared store if we scale out horizontally.

export type RateLimiter = {
  /** Records a hit for `key` and returns true if it is now over the limit. */
  limited: (key: string) => boolean;
};

export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    limited(key: string): boolean {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter(
        (t) => now - t < opts.windowMs,
      );
      recent.push(now);
      hits.set(key, recent);
      // Bound memory: sweep fully-expired keys once the map grows large.
      if (hits.size > 5000) {
        for (const [k, times] of hits) {
          if (times.every((t) => now - t >= opts.windowMs)) hits.delete(k);
        }
      }
      return recent.length > opts.max;
    },
  };
}

/** Best-effort client IP from the proxy headers Nginx sets. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
