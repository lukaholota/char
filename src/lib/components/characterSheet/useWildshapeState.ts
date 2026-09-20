"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { ActiveBeastForm, AttachedForm, WildshapeStanding } from "@/server/db/wildshape";
import type { WildshapeUses } from "@/server/db/wildshape-uses";
import { loadWildshapeForms } from "@/server/db/wildshape-actions";

/// Стан Дикої форми завантажується один раз на лист, а не окремо картці й окремо другому шару:
/// картка на слайді Спорядження й підміна `pers` у каруселі мусять бачити ту саму активну форму,
/// інакше лист показуватиме звіра, якого вже скинули.

export type WildshapeState = {
  forms: AttachedForm[];
  standing: WildshapeStanding | null;
  active: ActiveBeastForm | null;
  uses: WildshapeUses | null;
  isLoaded: boolean;
  isPending: boolean;
  reload: () => void;
  /// Оптимістичний залишок пулу: кнопка лічильника малює нове число до відповіді сервера, а на
  /// невдачі повертає старе тим самим викликом.
  applyUsesRemaining: (remaining: number) => void;
};

export function useWildshapeState(persId: number): WildshapeState {
  const [forms, setForms] = useState<AttachedForm[]>([]);
  const [standing, setStanding] = useState<WildshapeStanding | null>(null);
  const [active, setActive] = useState<ActiveBeastForm | null>(null);
  const [uses, setUses] = useState<WildshapeUses | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    if (!navigator.onLine) {
      setIsLoaded(true);
      return;
    }

    loadWildshapeForms(persId)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setForms(result.forms);
          setStanding(result.standing);
          setActive(result.active);
          setUses(result.uses);
        }
        setIsLoaded(true);
      })
      .catch(() => {
        // Без мережі дія не доходить до сервера — картка Дикої форми чесно лишається порожньою.
        if (!cancelled) setIsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [persId]);

  const reload = useCallback(() => {
    if (!navigator.onLine) return;
    startTransition(async () => {
      const result = await loadWildshapeForms(persId);
      if (!result.ok) return;
      setForms(result.forms);
      setStanding(result.standing);
      setActive(result.active);
      setUses(result.uses);
    });
  }, [persId]);

  const applyUsesRemaining = useCallback((remaining: number) => {
    setUses((current) =>
      current ? { ...current, remaining: Math.max(0, Math.min(current.max, remaining)) } : current
    );
  }, []);

  return { forms, standing, active, uses, isLoaded, isPending, reload, applyUsesRemaining };
}
