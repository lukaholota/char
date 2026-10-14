"use client";

import { useCallback, useMemo } from "react";
import { useSpellRatingFinder } from "@/hooks/useSpellRatingFinder";
import { hasRatingList, type RatedCaster } from "@/lib/optimization/spell-rating-casters";
import type { SpellRatingMatch } from "@/lib/optimization/spell-rating-lookup";

export function useCatalogSpellRatings(input: { casters: readonly RatedCaster[]; isEmbedMode: boolean; is2024: boolean; isOn: boolean }) {
  const canOffer = input.isEmbedMode && !input.is2024 && hasRatingList(input.casters);
  const canRate = canOffer && input.isOn;
  const findForEnglishName = useSpellRatingFinder(input.casters, canRate);
  const findMatches = useCallback(
    (spell: { engName: string }): SpellRatingMatch[] => (findForEnglishName ? findForEnglishName(spell.engName) : []),
    [findForEnglishName],
  );
  const isReady = findForEnglishName !== null;
  return useMemo(() => ({ canOffer, canRate, isReady, findMatches }), [canOffer, canRate, isReady, findMatches]);
}
