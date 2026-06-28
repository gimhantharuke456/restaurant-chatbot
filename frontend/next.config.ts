import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsHmrCache: true,
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // "same-origin" blocks Google/Firebase OAuth popups from calling window.close().
          // "same-origin-allow-popups" preserves origin isolation while letting
          // first-party popups (Firebase sign-in) communicate back normally.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
