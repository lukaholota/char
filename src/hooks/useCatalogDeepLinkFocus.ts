"use client";

import { useEffect, useRef } from "react";
import { subscribeToSearchNavigation } from "@/lib/search/search-navigation";

/// Каталог отримує вибраний запис із адреси трьома шляхами: сторінка щойно відкрилася, читач
/// натиснув «назад» або прийшов перехід із омні-пошуку. Останній адресу може й не змінити, тож
/// він приходить подією — без неї повторний перехід на той самий підклас нічого б не зробив.
export function useCatalogDeepLinkFocus(focus: (source: "initial" | "search" | "popstate") => void) {
  const focusRef = useRef(focus);
  focusRef.current = focus;

  useEffect(() => {
    focusRef.current("initial");

    const onSearch = () => focusRef.current("search");
    const onPopState = () => focusRef.current("popstate");
    const unsubscribe = subscribeToSearchNavigation(onSearch);
    window.addEventListener("popstate", onPopState);
    return () => {
      unsubscribe();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);
}
