import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // hide the floating Next.js dev tools / build indicator
  devIndicators: false,
  // emit a self-contained server bundle (.next/standalone) for Windows deploy
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingIncludes: {
    "/": ["./drizzle/**/*"], // drizzle reads migration SQL at runtime
  },
};

export default nextConfig;
