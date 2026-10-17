"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRpgbotRecommendationsPreference } from "@/hooks/useRpgbotRecommendationsPreference";
import { findChoiceOptionRating, type ChoiceOptionRatingCatalog, type RatedClass, type RatedOption } from "@/lib/optimization/choice-option-rating-lookup";

let catalogLoading: Promise<ChoiceOptionRatingCatalog> | null = null;

function loadChoiceOptionRatingCatalog(): Promise<ChoiceOptionRatingCatalog> {
  catalogLoading ??= import("@/lib/optimization/choice-option-rating-catalog").then((module) => module.choiceOptionRatingCatalog);
  return catalogLoading;
}

function useChoiceOptionRatingCatalog(): ChoiceOptionRatingCatalog | null {
  const [catalog, setCatalog] = useState<ChoiceOptionRatingCatalog | null>(null);
  useEffect(() => {
    let isCurrent = true;
    loadChoiceOptionRatingCatalog().then((loaded) => {
      if (isCurrent) setCatalog(loaded);
    });
    return () => {
      isCurrent = false;
    };
  }, []);
  return catalog;
}

export function useChoiceOptionRatings(ratedClass: RatedClass | null | undefined, options: readonly RatedOption[]) {
  const [isOn, setIsOn] = useRpgbotRecommendationsPreference();
  const catalog = useChoiceOptionRatingCatalog();
  const isAvailable = useMemo(
    () => !!catalog && options.some((option) => findChoiceOptionRating(catalog, ratedClass, option) !== null),
    [catalog, ratedClass, options],
  );
  const findRating = useCallback(
    (option: RatedOption) => (catalog && isOn ? findChoiceOptionRating(catalog, ratedClass, option) : null),
    [catalog, isOn, ratedClass],
  );
  return { isAvailable, isOn, setIsOn, findRating };
}
