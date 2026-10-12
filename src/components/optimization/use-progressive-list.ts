"use client";

import { useCallback, useRef, useState } from "react";

export const PROGRESSIVE_PAGE_SIZE = 24;
const LOAD_AHEAD_MARGIN = "600px";

export function useProgressiveList(total: number, resetKey: string) {
  const [state, setState] = useState({ resetKey, count: PROGRESSIVE_PAGE_SIZE });
  const observerRef = useRef<IntersectionObserver | null>(null);
  if (state.resetKey !== resetKey) setState({ resetKey, count: PROGRESSIVE_PAGE_SIZE });
  const visibleCount = state.resetKey === resetKey ? state.count : PROGRESSIVE_PAGE_SIZE;

  const showMore = useCallback(() => {
    setState((previous) => ({ ...previous, count: previous.count + PROGRESSIVE_PAGE_SIZE }));
  }, []);

  const watchEnd = useCallback((element: HTMLElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) showMore();
    }, { rootMargin: LOAD_AHEAD_MARGIN });
    observer.observe(element);
    observerRef.current = observer;
  }, [showMore]);

  return { visibleCount, hasMore: visibleCount < total, showMore, watchEnd };
}
