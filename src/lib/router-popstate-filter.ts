import { removeSpellLinkFromSearch } from "@/lib/spell-link";

/**
 * Next на кожен `popstate` зі своїм станом перемальовує всю сторінку — навіть коли повертається
 * на адресу, яку вже показує. Так стається при закритті модалки заклинання чи діалогу: їхні записи
 * історії Next пропустив, тож «Назад» веде туди, де він і так стоїть. На Android ця робота
 * зупиняла анімацію закриття на ~0,25 с. Подію без `state` Next ігнорує, а решта слухачів
 * читає адресу, не `state`.
 */
declare global {
  interface Window {
    __beforeRouterPopState?: (event: PopStateEvent) => void;
  }
}

/// Слухачі на window викликаються в порядку додавання, а Next додає свій ще до того, як
/// виконуються модулі layout, — тож перше місце займає inline-скрипт у <head>.
export const RESERVE_FIRST_POPSTATE_LISTENER_SCRIPT =
  "window.addEventListener('popstate',function(e){var h=window.__beforeRouterPopState;if(h)h(e)})";

let routerHref: string | null = null;

export function rememberRouterHref(pathname: string, search: string): void {
  routerHref = joinPathAndSearch(pathname, search);
}

export function installRedundantTraversalFilter(): () => void {
  window.__beforeRouterPopState = hideRedundantTraversalFromRouter;
  return () => {
    if (window.__beforeRouterPopState === hideRedundantTraversalFromRouter) delete window.__beforeRouterPopState;
  };
}

export function hideRedundantTraversalFromRouter(event: PopStateEvent): void {
  if (!event.state || !isRouterAlreadyAt(window.location)) return;
  Object.defineProperty(event, "state", { value: null });
}

function isRouterAlreadyAt(location: Location): boolean {
  const params = new URLSearchParams(location.search);
  removeSpellLinkFromSearch(params);
  return routerHref === joinPathAndSearch(location.pathname, params.toString());
}

function joinPathAndSearch(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}
