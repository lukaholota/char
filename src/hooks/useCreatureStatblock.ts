"use client";

import { useEffect, useRef, useState } from "react";
import type { Ruleset } from "@prisma/client";
import { fetchCreatureStatblock } from "@/lib/catalog-reads";
import type { CreatureData } from "@/lib/bestiaryData";
import { toEntitySlug } from "@/lib/slug-utils";

/// Список бестіарію тримає лише вузький індекс (KR20.9), тож статблок приїжджає на розкриття й
/// лишається в памʼяті вкладки: повторний клік по вже переглянутій істоті малюється миттєво.
/// Перша істота каталогу передається сторінкою готовою, щоб типовий вхід на `/bestiary` не
/// починався з порожньої панелі.
export function useCreatureStatblock(
  key: string | null,
  ruleset: Ruleset,
  initial: CreatureData | null
): CreatureData | null {
  const loadedRef = useRef<Map<string, CreatureData>>(
    new Map(initial ? [[toEntitySlug(initial.nameEng), initial]] : [])
  );
  const [statblock, setStatblock] = useState<CreatureData | null>(
    () => (key && loadedRef.current.get(key)) || null
  );

  useEffect(() => {
    if (!key) {
      setStatblock(null);
      return;
    }

    const cached = loadedRef.current.get(key);
    if (cached) {
      setStatblock(cached);
      return;
    }

    setStatblock(null);
    let cancelled = false;
    fetchCreatureStatblock(key, ruleset)
      .then((loaded) => {
        if (cancelled || !loaded) return;
        loadedRef.current.set(key, loaded);
        setStatblock(loaded);
      })
      .catch((error: unknown) => console.error("Не вдалося завантажити статблок", error));

    return () => {
      cancelled = true;
    };
  }, [key, ruleset]);

  return statblock;
}
