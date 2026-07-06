import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["playwright"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.api.playstation.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "shared.fastly.steamstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "shared.akamai.steamstatic.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
