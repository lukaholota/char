const DRAFT_FRAGMENT_PREFIX = "#draft=";

export function appendDraftFragment(href: string, encoded: string | null): string {
  if (!encoded) return href;
  return `${href.split("#")[0]}${DRAFT_FRAGMENT_PREFIX}${encoded}`;
}

export function stripDraftFragment(href: string): string {
  const fragmentStart = href.indexOf(DRAFT_FRAGMENT_PREFIX);
  return fragmentStart === -1 ? href : href.slice(0, fragmentStart);
}

/** Reads `#draft=` from the address bar and removes it in the same tick, before anything reports the URL. */
export function takeDraftFragment(): string | null {
  if (typeof window === "undefined") return null;
  const { hash, href } = window.location;
  if (!hash.startsWith(DRAFT_FRAGMENT_PREFIX)) return null;
  window.history.replaceState(window.history.state, "", stripDraftFragment(href));
  return hash.slice(DRAFT_FRAGMENT_PREFIX.length);
}
