import type { NextConfig } from "next";

// @ts-ignore
import nextra from 'nextra';

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
});

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.INTERNAL_API_URL || 'http://localhost:8080/api'}/:path*`,
        },
      ],
      fallback: []
    };
  },
};

export default withNextra(nextConfig);
