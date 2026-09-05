const WEEK_IN_SECONDS = 60 * 60 * 24 * 7;
const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/** Дефолт Next — 4 години, тобто кожна ілюстрація раз на чверть доби їде на origin по 304. */
export const IMAGE_OPTIMIZER_CACHE_TTL = WEEK_IN_SECONDS;

export function buildStaticAssetHeaders() {
  return [
    {
      // Next віддає `public/` з `max-age=0`: браузер перепитує кожен файл щоразу.
      source: "/images/:path*",
      headers: [
        { key: "Cache-Control", value: `public, max-age=${WEEK_IN_SECONDS}, stale-while-revalidate=86400` },
      ],
    },
    {
      source: "/fonts/:path*",
      headers: [{ key: "Cache-Control", value: `public, max-age=${YEAR_IN_SECONDS}, immutable` }],
    },
  ];
}
