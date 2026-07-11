import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // Product images are admin-curated URLs on arbitrary hosts. Serving them
    // unoptimized loads them directly in the browser instead of routing through
    // Next's image optimizer — no per-host allowlist to maintain, and it avoids
    // turning the optimizer into an open proxy for admin-entered URLs.
    unoptimized: true,
  },
};

export default nextConfig;
