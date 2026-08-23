export const NO_AI_SEGMENT = "no-ai";
export const NO_AI_PREFIX = `/${NO_AI_SEGMENT}`;
export const NO_AI_REQUEST_HEADER = "x-no-ai";

const NON_PREFIXABLE_PREFIXES = ["/api/", "/_next/", "/images/", "/fonts/"];

export function hasNoAiPrefix(pathname: string): boolean {
  return pathname === NO_AI_PREFIX || pathname.startsWith(`${NO_AI_PREFIX}/`);
}

export function stripNoAiPrefix(pathname: string): string {
  if (!hasNoAiPrefix(pathname)) return pathname;
  return pathname.slice(NO_AI_PREFIX.length) || "/";
}

export function addNoAiPrefix(pathname: string): string {
  if (hasNoAiPrefix(pathname)) return pathname;
  return pathname === "/" ? NO_AI_PREFIX : `${NO_AI_PREFIX}${pathname}`;
}

/**
 * Rewrites an in-app href so it keeps (or drops) the no-AI segment.
 * External, hash-only and asset hrefs are returned untouched.
 */
export function buildHrefForNoAiMode(href: string, noAiEnabled: boolean): string {
  if (!isPrefixableHref(href)) return href;

  const cut = findQueryOrHashStart(href);
  const pathname = href.slice(0, cut);
  const tail = href.slice(cut);
  const nextPathname = noAiEnabled ? addNoAiPrefix(pathname) : stripNoAiPrefix(pathname);

  return `${nextPathname}${tail}`;
}

function isPrefixableHref(href: string): boolean {
  if (!href.startsWith("/")) return false;
  if (href.startsWith("//")) return false;
  return !NON_PREFIXABLE_PREFIXES.some((prefix) => href.startsWith(prefix));
}

function findQueryOrHashStart(href: string): number {
  const query = href.indexOf("?");
  const hash = href.indexOf("#");
  if (query === -1) return hash === -1 ? href.length : hash;
  if (hash === -1) return query;
  return Math.min(query, hash);
}
