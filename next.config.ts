import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  eslint: {
    // Allow builds to complete even when ESLint reports issues.
    // Useful for CI or when lint rules are too strict during development.
    ignoreDuringBuilds: true,
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
