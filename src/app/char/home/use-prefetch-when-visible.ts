"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { runWhenIdle } from "@/lib/run-when-idle";

const PREFETCH_IDLE_TIMEOUT_MS = 2000;

/**
 * Картка, яку видно на екрані, заздалегідь тягне скелет і код своєї сторінки — тоді тап одразу
 * показує лист, а не чекає сервера. Самі дані персонажа prefetch не бере: це 26+ запитів на картку.
 */
export function usePrefetchWhenVisible<T extends Element>(href: string | null) {
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);

  return useCallback(
    (element: T | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!element || !href || typeof IntersectionObserver === "undefined") return;

      const observer = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        runWhenIdle(() => router.prefetch(href), PREFETCH_IDLE_TIMEOUT_MS);
      });
      observer.observe(element);
      observerRef.current = observer;
    },
    [href, router],
  );
}
