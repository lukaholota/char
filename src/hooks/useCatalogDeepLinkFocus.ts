"use client";

import { useEffect } from "react";
import { subscribeToSearchNavigation } from "@/lib/search/search-navigation";

/// Каталог отримує вибраний запис із адреси трьома шляхами: сторінка щойно відкрилася, читач
/// натиснув «назад» або прийшов перехід із омні-пошуку. Останній адресу може й не змінити, тож
/// він приходить подією — без неї повторний перехід на той самий підклас нічого б не зробив.
export function useCatalogDeepLinkFocus(focus: () => void) {
  useEffect(() => {
    focus();

    const unsubscribe = subscribeToSearchNavigation(focus);
    window.addEventListener("popstate", focus);
    return () => {
      unsubscribe();
      window.removeEventListener("popstate", focus);
    };
  }, [focus]);
}
