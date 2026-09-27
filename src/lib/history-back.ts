const HISTORY_BACK_SETTLE_TIMEOUT_MS = 1000;

let pendingHistoryBack: Promise<void> | null = null;

// history.back() is async: an entry pushed in the same click lands first, then the late
// traversal pops it — a modal opened that way closes itself.
export function goBackInHistory(steps = 1): void {
  pendingHistoryBack = new Promise<void>((resolve) => {
    const settle = () => {
      window.removeEventListener("popstate", settle);
      window.clearTimeout(timeoutId);
      pendingHistoryBack = null;
      resolve();
    };
    const timeoutId = window.setTimeout(settle, HISTORY_BACK_SETTLE_TIMEOUT_MS);
    window.addEventListener("popstate", settle);
  });
  window.history.go(-steps);
}

export function waitForPendingHistoryBack(): Promise<void> {
  return Promise.resolve().then(() => pendingHistoryBack ?? undefined);
}

const NEXT_ROUTER_STATE_KEYS = ["__NA", "__PRIVATE_NEXTJS_INTERNALS_TREE"];

// Next copies its own keys back and updates its URL only when they are absent; with `__NA`
// it treats the call as its own, keeps the old URL and writes it back on its next render.
export function readHistoryStateWithoutNextRouter(): Record<string, unknown> {
  const state = { ...((window.history.state as Record<string, unknown> | null) ?? {}) };
  for (const key of NEXT_ROUTER_STATE_KEYS) delete state[key];
  return state;
}

export function replaceUrlKeepingHistoryState(url: string): void {
  window.history.replaceState(readHistoryStateWithoutNextRouter(), "", url);
}
