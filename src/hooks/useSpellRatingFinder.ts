"use client";

import { useEffect, useMemo, useState } from "react";
import { createSpellRatingFinder, type SpellRatingCatalog, type SpellRatingMatch } from "@/lib/optimization/spell-rating-lookup";
import type { RatedCaster } from "@/lib/optimization/spell-rating-casters";

export type SpellRatingFinder = (spellEngName: string) => SpellRatingMatch[];

let catalogLoading: Promise<SpellRatingCatalog> | null = null;

function loadSpellRatingCatalog(): Promise<SpellRatingCatalog> {
  catalogLoading ??= import("@/lib/optimization/spell-rating-catalog").then((module) => module.spellRatingCatalog);
  return catalogLoading;
}

export function useSpellRatingCatalog(isEnabled: boolean): SpellRatingCatalog | null {
  const [catalog, setCatalog] = useState<SpellRatingCatalog | null>(null);

  useEffect(() => {
    if (!isEnabled) return;
    let isCurrent = true;
    loadSpellRatingCatalog().then((loaded) => {
      if (isCurrent) setCatalog(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, [isEnabled]);

  return isEnabled ? catalog : null;
}

export function useSpellRatingFinder(casters: readonly RatedCaster[], isEnabled: boolean): SpellRatingFinder | null {
  const catalog = useSpellRatingCatalog(isEnabled);
  return useMemo(() => (catalog ? createSpellRatingFinder(catalog, casters) : null), [catalog, casters]);
}
