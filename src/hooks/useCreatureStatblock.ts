"use client";

import { useEffect, useRef, useState } from "react";
import type { Ruleset } from "@prisma/client";
import { fetchCreatureStatblock, type CreatureStatblockView } from "@/lib/catalog-reads";
import { toEntitySlug } from "@/lib/slug-utils";

const EMPTY_VIEW: CreatureStatblockView = { creature: null, loreGroup: null };

/// Список бестіарію тримає лише вузький індекс (KR20.9), тож статблок і вступ до групи істот
/// приїжджають на розкриття одним запитом і лишаються в памʼяті вкладки: повторний клік по вже
/// переглянутій істоті малюється миттєво. Перша істота каталогу передається сторінкою готовою,
/// щоб типовий вхід на `/bestiary` не починався з порожньої панелі.
export function useCreatureStatblock(
  key: string | null,
  ruleset: Ruleset,
  initial: CreatureStatblockView | null
): CreatureStatblockView {
  const loadedRef = useRef<Map<string, CreatureStatblockView>>(
    new Map(initial?.creature ? [[toEntitySlug(initial.creature.nameEng), initial]] : [])
  );
  const [view, setView] = useState<CreatureStatblockView>(
    () => (key && loadedRef.current.get(key)) || EMPTY_VIEW
  );

  useEffect(() => {
    if (!key) {
      setView(EMPTY_VIEW);
      return;
    }

    const cached = loadedRef.current.get(key);
    if (cached) {
      setView(cached);
      return;
    }

    setView(EMPTY_VIEW);
    let cancelled = false;
    fetchCreatureStatblock(key, ruleset)
      .then((loaded) => {
        if (cancelled || !loaded?.creature) return;
        loadedRef.current.set(key, loaded);
        setView(loaded);
      })
      .catch((error: unknown) => console.error("Не вдалося завантажити статблок", error));

    return () => {
      cancelled = true;
    };
  }, [key, ruleset]);

  return view;
}
