import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Fail the build on ESLint errors (Diff1)
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      // Habbo imaging and assets
      { protocol: 'https', hostname: 'images.habbo.com', pathname: '/**' },
      { protocol: 'http', hostname: 'images.habbo.com', pathname: '/**' },
      { protocol: 'https', hostname: 'www.habbo.fr', pathname: '/**' },
      { protocol: 'https', hostname: 'www.habbo.com', pathname: '/**' },
      // Habbone (legacy/news links)
      { protocol: 'https', hostname: 'habbone.fr', pathname: '/**' },
      { protocol: 'http', hostname: 'habbone.fr', pathname: '/**' },
      // Directus API (production)
      { protocol: 'https', hostname: 'api.habbone.fr', pathname: '/**' },
      // Local Directus dev server
      { protocol: 'http', hostname: 'localhost', port: '8055', pathname: '/**' },
    ],
  },
};

export default nextConfig;
