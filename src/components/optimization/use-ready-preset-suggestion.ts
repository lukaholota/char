"use client";

import { useEffect, useState } from "react";
import type { PresetSuggestion, PresetSuggestionQuery } from "@/lib/optimization/ready-preset-suggestion";

export type PresetSuggestionResponse = { total: number; best: PresetSuggestion | null };

const SUGGESTION_DEBOUNCE_MS = 250;

function buildSuggestionUrl(query: PresetSuggestionQuery): string {
  const params = new URLSearchParams({ classKey: query.classKey });
  if (query.subclassKey) params.set("subclassKey", query.subclassKey);
  if (query.raceKey) params.set("raceKey", query.raceKey);
  return `/api/optimization/ready-preset-suggestion?${params}`;
}

export function useReadyPresetSuggestion(query: PresetSuggestionQuery | null): PresetSuggestionResponse | null {
  const [loaded, setLoaded] = useState<{ url: string; response: PresetSuggestionResponse } | null>(null);
  const url = query ? buildSuggestionUrl(query) : null;

  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(url, { signal: controller.signal })
        .then((response) => (response.ok ? (response.json() as Promise<PresetSuggestionResponse>) : null))
        .then((response) => setLoaded(response ? { url, response } : null))
        .catch(() => {
          if (!controller.signal.aborted) setLoaded(null);
        });
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [url]);

  return loaded && loaded.url === url ? loaded.response : null;
}
