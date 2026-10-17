import { replaceUrlKeepingHistoryState } from "@/lib/history-back";

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
  const cleanUrl = stripDraftFragment(href);
  window.history.replaceState(window.history.state, "", cleanUrl);
  scheduleRouterUrlSync(cleanUrl, ROUTER_SYNC_ATTEMPTS);
  return hash.slice(DRAFT_FRAGMENT_PREFIX.length);
}

const ROUTER_SYNC_ATTEMPTS = 40;
const ROUTER_SYNC_RETRY_MS = 50;

// The page reads the fragment before Next patches history, so Next still holds the URL with
// #draft and would write it back on its next navigation; the patched replaceState updates it.
function scheduleRouterUrlSync(cleanUrl: string, attemptsLeft: number): void {
  window.setTimeout(() => {
    if (window.location.href !== cleanUrl) return;
    if (!syncRouterUrl(cleanUrl) && attemptsLeft > 1) scheduleRouterUrlSync(cleanUrl, attemptsLeft - 1);
  }, attemptsLeft === ROUTER_SYNC_ATTEMPTS ? 0 : ROUTER_SYNC_RETRY_MS);
}

function syncRouterUrl(cleanUrl: string): boolean {
  const routerState = window.history.state as Record<string, unknown> | null;
  if (!routerState?.__NA) return true;
  replaceUrlKeepingHistoryState(cleanUrl);
  if ((window.history.state as Record<string, unknown> | null)?.__NA) return true;
  window.history.replaceState(routerState, "", cleanUrl);
  return false;
}
