import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Generates a minimal Node.js server for the production Docker image.
  // Runtime-owned data and public assets are copied explicitly by Dockerfile.
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
  allowedDevOrigins: ["192.168.1.101", "192.168.1.133"],
};

export default nextConfig;
