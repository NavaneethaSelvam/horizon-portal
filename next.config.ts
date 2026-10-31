import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep the dev server's hot-reload bundles separate from production builds.
  // Running `next dev` and `next build` together must not overwrite one another.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
