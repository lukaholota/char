"use client";

import { useCallback, useMemo } from "react";
import { useSpellRatingFinder } from "@/hooks/useSpellRatingFinder";
import { hasRatingList, type RatedCaster } from "@/lib/optimization/spell-rating-casters";
import type { SpellRatingMatch } from "@/lib/optimization/spell-rating-lookup";

export function useCatalogSpellRatings(input: { casters: readonly RatedCaster[]; isEmbedMode: boolean; is2024: boolean }) {
  const canRate = input.isEmbedMode && !input.is2024 && hasRatingList(input.casters);
  const findForEnglishName = useSpellRatingFinder(input.casters, canRate);
  const findMatches = useCallback(
    (spell: { engName: string }): SpellRatingMatch[] => (findForEnglishName ? findForEnglishName(spell.engName) : []),
    [findForEnglishName],
  );
  const isReady = findForEnglishName !== null;
  return useMemo(() => ({ canRate, isReady, findMatches }), [canRate, isReady, findMatches]);
}
