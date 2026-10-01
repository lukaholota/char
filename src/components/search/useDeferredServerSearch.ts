"use client";

import { useEffect, useState } from "react";

const SERVER_SEARCH_DELAY_MS = 200;
const MIN_SERVER_QUERY_LENGTH = 2;

export type DeferredServerSearch<Hit> = {
  hits: Hit[];
  isPending: boolean;
};

type SettledSearch<Hit> = {
  query: string;
  hits: Hit[];
};

/// Друга, асинхронна фаза пошуку (Р14): те, чого в статичному індексі бути не може, бо живе в
/// базі — персонажі людини, хоумбрю спільноти. Запит іде з затримкою й скасовується, коли
/// користувач дописує далі; помилка сервера означає порожню видачу, а не зламану панель.
export function useDeferredServerSearch<Hit>(
  query: string,
  fetchHits: (query: string) => Promise<Hit[]>,
): DeferredServerSearch<Hit> {
  const [settled, setSettled] = useState<SettledSearch<Hit>>({ query: "", hits: [] });
  const trimmed = query.trim();
  const isServerQuery = trimmed.length >= MIN_SERVER_QUERY_LENGTH;

  useEffect(() => {
    if (!isServerQuery) {
      setSettled({ query: trimmed, hits: [] });
      return;
    }

    let active = true;
    const timer = window.setTimeout(() => {
      fetchHits(trimmed)
        .then((hits) => {
          if (active) setSettled({ query: trimmed, hits });
        })
        .catch(() => {
          if (active) setSettled({ query: trimmed, hits: [] });
        });
    }, SERVER_SEARCH_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [trimmed, isServerQuery, fetchHits]);

  return {
    hits: isServerQuery ? settled.hits : [],
    isPending: isServerQuery && settled.query !== trimmed,
  };
}
