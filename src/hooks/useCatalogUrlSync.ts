"use client";

import { useEffect, useRef, useState } from "react";
import { getSearchParamsFromLocation, replaceUrlSearchParams } from "@/lib/catalog-url-helpers";

type InitialSearchParams = Record<string, string | string[] | undefined>;

export function useCatalogUrlSync<T extends { q: string }>(
  initialSearchParams: InitialSearchParams,
  parseSelection: (params: URLSearchParams) => T
) {
  const initialQ = (() => {
    const raw = initialSearchParams.q;
    return Array.isArray(raw) ? raw[0] ?? "" : raw ?? "";
  })();

  const [qInput, setQInput] = useState(initialQ);
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
      const next = parseSelection(getSearchParamsFromLocation());
      setSelection(next);
      const nextQ = next.q || "";
      setQInput((prev) => (prev === nextQ ? prev : nextQ));
    };

    window.addEventListener("popstate", sync);
    window.addEventListener("locationchange", sync);
    sync();

    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("locationchange", sync);
    };
  }, [parseSelection]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const next = getSearchParamsFromLocation();
      const normalized = qInput.trim();
      if (!normalized) next.delete("q");
      else next.set("q", qInput);
      replaceUrlSearchParams(next);
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [qInput]);

  return {
    qInput,
    setQInput,
    selection,
    setSelection,
  };
}
