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
