import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.INTERNAL_API_URL || 'http://localhost:8080/api'}/:path*`, // Proxy to backend
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
