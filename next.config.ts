import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Generates a minimal Node.js server for the production Docker image.
  // Runtime-owned data and public assets are copied explicitly by Dockerfile.
  output: "standalone",
  experimental: {
    // Trade build speed for lower peak memory on small deployment hosts.
    cpus: 1,
    staticGenerationMaxConcurrency: 1,
    webpackMemoryOptimizations: true,
    // Load routes on demand to reduce startup memory (not a runtime cap).
    preloadEntriesOnStart: false,
  },
  turbopack: {
    root: path.join(__dirname),
  },
  allowedDevOrigins: ["192.168.1.101", "192.168.1.133"],
};

export default nextConfig;
