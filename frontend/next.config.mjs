import nextra from 'nextra'

const withNextra = nextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.INTERNAL_API_URL || 'http://localhost:8080/api'}/:path*`,
        },
        {
          source: "/icons/:slug",
          destination: "https://cdn.simpleicons.org/:slug",
        },
      ],
      fallback: []
    };
  },
};

export default withNextra(nextConfig);
