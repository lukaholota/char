import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

import { IMAGE_OPTIMIZER_CACHE_TTL, buildStaticAssetHeaders } from "./src/lib/assets/cache-policy";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    webpackMemoryOptimizations: true
  },
  images: {
    minimumCacheTTL: IMAGE_OPTIMIZER_CACHE_TTL,
  },
  async headers() {
    return buildStaticAssetHeaders();
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
    ];
  },
};

// Source maps вимкнені явно, а не «поки не налаштували». Без них стектрейси мініфіковані —
// це відомий хвіст (див. docs/MONITORING.md). Але увімкнені без вивантаження вони гірші за
// вимкнені: .map лягли б поруч зі збіркою й роздавалися б публічно, тобто вихідний код сайту
// став би доступним усім. Вмикати одночасно з SENTRY_AUTH_TOKEN, не раніше.
export default withSentryConfig(nextConfig, {
  org: "char-da",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  sourcemaps: { disable: true },
});
