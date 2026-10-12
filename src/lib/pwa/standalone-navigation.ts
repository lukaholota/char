"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { findDisplayMode } from "./install-platform";


function subscribe(listener: () => void) {
  const media = window.matchMedia?.("(display-mode: standalone)");
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
}

export function useStandaloneMode() {
  return useSyncExternalStore(subscribe, () => findDisplayMode() === "standalone", () => false);
}

export function hasAppHistory(): boolean {
  return Number.isSafeInteger(window.history.state?.__charHistoryIndex) && window.history.state.__charHistoryIndex > 0;
}

// History state carries no change event; re-read it whenever the route changes.
export function useHasAppHistory(routeKey: string): boolean {
  const [hasHistory, setHasHistory] = useState(false);
  useEffect(() => setHasHistory(hasAppHistory()), [routeKey]);
  return hasHistory;
}
