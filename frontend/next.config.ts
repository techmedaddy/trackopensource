import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://backend:8080/api/:path*", // Proxy to backend
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
