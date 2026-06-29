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
      // Habbone public domain
      { protocol: 'https', hostname: 'habbone.fr', pathname: '/**' },
      // PocketBase (production) — uploaded images are served from here
      { protocol: 'https', hostname: 'pb.habbone.fr', pathname: '/**' },
      // PocketBase (local dev)
      { protocol: 'http', hostname: '127.0.0.1', port: '8090', pathname: '/**' },
      { protocol: 'http', hostname: 'localhost', port: '8090', pathname: '/**' },
    ],
  },
};

export default nextConfig;
