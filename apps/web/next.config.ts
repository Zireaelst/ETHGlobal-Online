import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@blockterms/ui", "@blockterms/protocol"],
};

export default nextConfig;
