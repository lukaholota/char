"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSearchParamsFromLocation, replaceUrlSearchParams } from "@/lib/catalog-url-helpers";

type InitialSearchParams = Record<string, string | string[] | undefined>;

/// `initialSearchParams` потрібні лише сторінкам, які рендеряться на сервері з відомим запитом.
/// Каталоги статичні (KR22.4): вони нічого не передають, а фільтри з адреси читає `sync()` нижче
/// одразу після монтування. Прапорець лишений для `/spells` і `/magic-items` — вони динамічні
/// через режим вбудовування з листа персонажа.
export function useCatalogUrlSync<T extends { q: string }>(
  parseSelection: (params: URLSearchParams) => T,
  initialSearchParams: InitialSearchParams = {}
) {
  const initialQ = (() => {
    const raw = initialSearchParams.q;
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  })();

  const [qInput, updateQInput] = useState(initialQ);
  const debounceRef = useRef<number | null>(null);

  const [selection, setSelection] = useState<T>(() => {
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(initialSearchParams)) {
      const v = Array.isArray(value) ? value[0] : value;
      if (typeof v === "string") urlParams.set(key, v);
    }
    return parseSelection(urlParams);
  });

  useEffect(() => {
    const sync = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
      const next = parseSelection(getSearchParamsFromLocation());
      setSelection(next);
      const nextQ = next.q || "";
      updateQInput((prev) => (prev === nextQ ? prev : nextQ));
    };

    window.addEventListener("popstate", sync);
    window.addEventListener("locationchange", sync);
    sync();

    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("locationchange", sync);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [parseSelection]);

  const setQInput = useCallback((nextQuery: string) => {
    updateQInput(nextQuery);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      const next = getSearchParamsFromLocation();
      const normalized = nextQuery.trim();
      if (!normalized) next.delete("q");
      else next.set("q", nextQuery);
      replaceUrlSearchParams(next);
    }, 250);
  }, []);

  return {
    qInput,
    setQInput,
    selection,
    setSelection,
  };
}
