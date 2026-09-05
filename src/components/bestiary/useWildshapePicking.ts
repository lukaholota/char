"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import type { Ruleset } from "@prisma/client";
import { toast } from "sonner";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import {
  NO_WILDSHAPE_FILTER,
  type WildshapeFilter,
  findEntryEligibility,
  findWildshapeFilter,
  matchesWildshapeFilter,
  writeWildshapeFilter,
} from "@/lib/bestiary-wildshape";
import { getSearchParamsFromLocation, replaceUrlSearchParams } from "@/lib/catalog-url-helpers";
import type { WildshapeEligibility } from "@/rules/wildshape";
import type { WildshapeCharacter, WildshapeStanding } from "@/server/db/wildshape";
import {
  attachWildshapeForm,
  loadWildshapeCharacters,
  loadWildshapePicker,
} from "@/server/db/wildshape-actions";

/// Каталог питає те саме правило, що й лист із сервером ([Р-4]): рядок індексу везе швидкості
/// числами (KR24.1), тож придатність рахується просто тут. Із сервера приходить лише те, чого
/// браузер знати не може, — рівень друїда, коло й уже прикріплені форми.

type PickerContext = {
  persId: number;
  standing: WildshapeStanding;
  attachedKeys: Set<string>;
};

export type WildshapePicking = {
  characters: WildshapeCharacter[];
  filter: WildshapeFilter;
  standing: WildshapeStanding | null;
  isAdding: boolean;
  selectPers: (persId: number | null) => void;
  showOnlyEligible: (value: boolean) => void;
  findEligibility: (entry: CreatureIndexEntry) => WildshapeEligibility | null;
  isAttached: (entry: CreatureIndexEntry) => boolean;
  matches: (entry: CreatureIndexEntry) => boolean;
  addForm: (entry: CreatureIndexEntry) => void;
};

export function useWildshapePicking(ruleset: Ruleset): WildshapePicking {
  const [filter, setFilter] = useState<WildshapeFilter>(NO_WILDSHAPE_FILTER);
  const [characters, setCharacters] = useState<WildshapeCharacter[]>([]);
  const [picker, setPicker] = useState<PickerContext | null>(null);
  const [isAdding, startAdding] = useTransition();

  /// Сторінка каталогу статична (KR22.4), тож адреса читається вже після монтування — так само,
  /// як це робить `useCatalogUrlSync` для решти фільтрів.
  useEffect(() => setFilter(findWildshapeFilter(getSearchParamsFromLocation())), []);

  /// Секція Дикої форми — надбудова над публічним каталогом: якщо сервер не відповів, бестіарій
  /// мусить лишитися робочим без неї, тож обрив звʼязку тут гаситься свідомо.
  useEffect(() => {
    let isStale = false;
    loadWildshapeCharacters()
      .then((list) => {
        if (!isStale) setCharacters(list);
      })
      .catch(() => setCharacters([]));

    return () => {
      isStale = true;
    };
  }, []);

  const persId = filter.persId;

  useEffect(() => {
    if (persId === null) {
      setPicker(null);
      return;
    }

    let isStale = false;
    loadWildshapePicker(persId)
      .then((result) => {
        if (isStale || !result.ok) return;
        setPicker({ persId, standing: result.standing, attachedKeys: new Set(result.attachedKeys) });
      })
      .catch(() => setPicker(null));

    return () => {
      isStale = true;
    };
  }, [persId]);

  const standing = picker && picker.persId === persId ? picker.standing : null;

  const applyFilter = useCallback((next: WildshapeFilter) => {
    setFilter(next);
    const params = getSearchParamsFromLocation();
    writeWildshapeFilter(params, next);
    replaceUrlSearchParams(params);
  }, []);

  const findEligibility = useCallback(
    (entry: CreatureIndexEntry) => (standing ? findEntryEligibility(entry, standing) : null),
    [standing]
  );

  const addForm = useCallback(
    (entry: CreatureIndexEntry) => {
      if (persId === null) return;

      startAdding(async () => {
        const result = await attachWildshapeForm({ persId, creatureKey: entry.key, ruleset });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }

        // Непридатна форма прикріплюється ([Р-3]) — але гравець має почути, чого їй бракує.
        for (const warning of result.warnings) toast.warning(warning);
        toast.success(`${entry.name} — форму додано`);

        setPicker((prev) =>
          prev ? { ...prev, attachedKeys: new Set(prev.attachedKeys).add(entry.key) } : prev
        );
        window.parent?.postMessage({ type: "WILDSHAPE_FORM_ADDED", persId }, window.location.origin);
      });
    },
    [persId, ruleset]
  );

  return useMemo(
    () => ({
      characters,
      filter,
      standing,
      isAdding,
      selectPers: (nextPersId) => applyFilter({ persId: nextPersId, onlyEligible: filter.onlyEligible }),
      showOnlyEligible: (value) => applyFilter({ ...filter, onlyEligible: value }),
      findEligibility,
      isAttached: (entry) => picker?.attachedKeys.has(entry.key) ?? false,
      matches: (entry) => matchesWildshapeFilter(entry, filter, standing),
      addForm,
    }),
    [characters, filter, standing, isAdding, applyFilter, findEligibility, picker, addForm]
  );
}
