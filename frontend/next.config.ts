import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Reduce startup RAM: don't preload all page modules into memory on boot.
    // Pages load on first request instead — same eventual footprint, lower peak.
    preloadEntriesOnStart: false,

    // Cache server-component fetch() responses across HMR refreshes in dev.
    // Prevents re-fetching every backend endpoint on every file save.
    serverComponentsHmrCache: true,

    // Tell the compiler to tree-shake these barrel-file packages more aggressively.
    // Without this, importing one icon from lucide-react pulls in the entire set.
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};

export default nextConfig;
