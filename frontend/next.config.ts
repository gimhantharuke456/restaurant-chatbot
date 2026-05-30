import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsHmrCache: true,
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
