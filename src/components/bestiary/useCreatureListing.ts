"use client";

import { useEffect, useState } from "react";
import { Ruleset } from "@prisma/client";
import { findCreatureKeysMatchingText } from "@/lib/actions/bestiary-actions";
import { createCreatureShuffleSeed } from "@/lib/bestiary-sort";

/// Механіка списку бестіарію, яка не є розміткою: у якому порядку показувати й що вважати збігом.

/// Сіянка зʼявляється лише після монтування: сторінка бестіарію статична (KR22.4), тож на
/// першому рендері порядок мусить збігтися з тим, що прийшов з сервера, інакше гідратація
/// розійдеться. До того список іде як є, а перемішується вже в браузері.
export function useShuffleSeed(): number | null {
  const [seed, setSeed] = useState<number | null>(null);

  useEffect(() => {
    setSeed(createCreatureShuffleSeed());
  }, []);

  return seed;
}

/// Друга фаза пошуку: проза статблока лишилася на сервері, тож збіги в діях і описі долітають
/// окремо й домальовуються до вже показаних ([Р14](docs/DECISIONS.md#р14)). Вузький збіг за
/// назвою — підмножина повного, тож поки відповідь у дорозі, список не порожній, а звужений.
export function useDeepSearchMatches(query: string, ruleset: Ruleset): ReadonlySet<string> | null {
  const [matches, setMatches] = useState<{ query: string; keys: Set<string> } | null>(null);
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) {
      setMatches(null);
      return;
    }

    let cancelled = false;
    findCreatureKeysMatchingText(trimmed, ruleset).then((keys) => {
      if (!cancelled) setMatches({ query: trimmed, keys: new Set(keys) });
    });

    return () => {
      cancelled = true;
    };
  }, [trimmed, ruleset]);

  return matches && matches.query === trimmed ? matches.keys : null;
}
