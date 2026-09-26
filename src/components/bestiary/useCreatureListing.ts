"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildCreatureIndexEntry, type CreatureIndexEntry } from "@/lib/bestiary-index";
import { useCatalogHomebrew } from "@/hooks/useCommunityHomebrew";
import { toHomebrewCatalogId, type HomebrewCatalogEntry, type HomebrewCreatureEntry } from "@/lib/logic/homebrew-view";
import { buildHomebrewCreatureKey, type HomebrewSort } from "@/lib/logic/homebrew-catalog";
import { Ruleset } from "@/lib/prisma-enums";
import { fetchCreatureKeysMatchingText } from "@/lib/catalog-reads";
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
    fetchCreatureKeysMatchingText(trimmed, ruleset)
      .then((keys) => {
        if (!cancelled) setMatches({ query: trimmed, keys: new Set(keys) });
      })
      .catch((error: unknown) => console.error("Не вдалося знайти збіги в статблоках", error));

    return () => {
      cancelled = true;
    };
  }, [trimmed, ruleset]);

  return matches && matches.query === trimmed ? matches.keys : null;
}

/// Хоумбрю спільноти домішується до індексу, лише коли перемикач увімкнено (KR31.16); на `/homebrew` каталог порожній і хоумбрю ввімкнене завжди.
export function useIndexWithCommunityHomebrew(catalogIndex: CreatureIndexEntry[], ruleset: Ruleset, isOn: boolean, onlyHomebrewSort: HomebrewSort | null) {
  const communityHomebrew = useCatalogHomebrew({ kind: "CREATURE", ruleset, isOn, onlyHomebrewSort });
  const index = useMemo(() => [...catalogIndex, ...communityHomebrew.flatMap(toHomebrewIndexEntry)], [catalogIndex, communityHomebrew]);
  const findCommunityEntry = useCallback(
    (creature: CreatureIndexEntry | null) => communityHomebrew.find((entry): entry is HomebrewCreatureEntry => entry.kind === "CREATURE" && toHomebrewCatalogId(entry.entryId) === creature?.creatureId) ?? null,
    [communityHomebrew],
  );
  return { index, communityCount: communityHomebrew.length, findCommunityEntry };
}

export function isCommunityCreature(creature: CreatureIndexEntry): boolean {
  return creature.source === "HOMEBREW" && creature.creatureId < 0;
}

function toHomebrewIndexEntry(entry: HomebrewCatalogEntry): CreatureIndexEntry[] {
  return entry.kind === "CREATURE" ? [{ ...buildCreatureIndexEntry(entry.creature), key: buildHomebrewCreatureKey(entry.entryId) }] : [];
}
