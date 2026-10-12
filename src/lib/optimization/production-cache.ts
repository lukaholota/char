import { unstable_cache } from "next/cache";

/** RPGbot reads only files shipped in the image, but linking them takes seconds; dev reads fresh drafts. */
export function cacheInProduction<Args extends unknown[], Result>(read: (...args: Args) => Promise<Result>, key: string): (...args: Args) => Promise<Result> {
  return process.env.NODE_ENV === "production" ? unstable_cache(read, [key]) : read;
}
