import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.GITHUB_PAGES === "1" ? "/new-repo" : undefined,
  assetPrefix: process.env.GITHUB_PAGES === "1" ? "/new-repo" : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
