import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: {
    // Allow builds to complete even when ESLint reports issues.
    // Useful for CI or when lint rules are too strict during development.
    ignoreDuringBuilds: true,
  },
  experimental: {
    webpackMemoryOptimizations: true
  }, 
  async redirects() {
    return [
      {
        source: "/spell",
        destination: "/spells",
        permanent: true,
      },
      {
        source: "/spell/:path*",
        destination: "/spells/:path*",
        permanent: true,
      },
      {
        source: "/pers/:path*",
        destination: "/char/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
