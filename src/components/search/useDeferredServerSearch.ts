"use client";

import { useEffect, useState } from "react";

const SERVER_SEARCH_DELAY_MS = 200;
const MIN_SERVER_QUERY_LENGTH = 2;

/// Друга, асинхронна фаза пошуку (Р14): те, чого в статичному індексі бути не може, бо живе в
/// базі — персонажі людини, хоумбрю спільноти. Запит іде з затримкою й скасовується, коли
/// користувач дописує далі; помилка сервера означає порожню видачу, а не зламану панель.
export function useDeferredServerSearch<Hit>(
  query: string,
  fetchHits: (query: string) => Promise<Hit[]>,
): Hit[] {
  const [hits, setHits] = useState<Hit[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_SERVER_QUERY_LENGTH) {
      setHits([]);
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      fetchHits(trimmed)
        .then((result) => {
          if (active) setHits(result);
        })
        .catch(() => {
          if (active) setHits([]);
        });
    }, SERVER_SEARCH_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, fetchHits]);

  return hits;
}
