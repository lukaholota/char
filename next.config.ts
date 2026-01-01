import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Allow builds to complete even when ESLint reports issues.
    // Useful for CI or when lint rules are too strict during development.
    ignoreDuringBuilds: true,
  },
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // Removed 2048, 3840 for faster generation
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  async redirects() {
    return [
      {
        source: "/pers/:path*",
        destination: "/char/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
