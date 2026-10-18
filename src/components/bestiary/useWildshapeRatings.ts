"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Ruleset } from "@prisma/client";
import type { WildshapePicking } from "@/components/bestiary/useWildshapePicking";
import { useRpgbotRecommendationsPreference } from "@/hooks/useRpgbotRecommendationsPreference";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import { captureRpgbotEvent } from "@/lib/monitoring/rpgbot-analytics";
import { useRpgbotSurfaceView } from "@/lib/monitoring/use-rpgbot-surface-view";
import { sortByBestRating } from "@/lib/optimization/spell-rating-lookup";
import {
  canRateWildshape,
  findRecommendationScore,
  findWildshapeFormRating,
  type WildshapeFormRating,
  type WildshapeRatingCatalog,
} from "@/lib/optimization/wildshape-rating-lookup";

export type WildshapeRatings = {
  canRate: boolean;
  isOn: boolean;
  setIsOn: (isOn: boolean) => void;
  catalog: WildshapeRatingCatalog | null;
  findRating: (entry: CreatureIndexEntry) => WildshapeFormRating | null;
  rankRecommendedFirst: (entries: CreatureIndexEntry[]) => CreatureIndexEntry[];
};

let catalogLoading: Promise<WildshapeRatingCatalog> | null = null;

function loadWildshapeRatingCatalog(): Promise<WildshapeRatingCatalog> {
  catalogLoading ??= import("@/lib/optimization/wildshape-rating-catalog")
    .then((module) => module.wildshapeRatingCatalog)
    .catch((error: unknown) => {
      catalogLoading = null;
      throw error;
    });
  return catalogLoading;
}

export function useWildshapeRatings(ruleset: Ruleset, wildshape: WildshapePicking): WildshapeRatings {
  const { standing, findEligibility } = wildshape;
  const canRate = canRateWildshape(ruleset, standing);
  const [isOn, setPreference] = useRpgbotRecommendationsPreference();
  const loaded = useLoadedCatalog(canRate && isOn);
  const catalog = canRate && isOn ? loaded : null;

  useRpgbotSurfaceView(canRate && standing ? { surface: "wildshape_picker", target_level: standing.druidLevel, recommendations_on: isOn } : null);

  const setIsOn = useCallback((next: boolean) => {
    setPreference(next);
    captureRpgbotEvent("rpgbot_wildshape_recommendations_toggled", { enabled: next });
  }, [setPreference]);

  const isMoonCircle = standing?.isMoonCircle ?? false;
  const findRating = useCallback(
    (entry: CreatureIndexEntry) => (catalog ? findWildshapeFormRating(catalog, entry.key, isMoonCircle) : null),
    [catalog, isMoonCircle],
  );

  const rankRecommendedFirst = useCallback(
    (entries: CreatureIndexEntry[]) => (catalog ? sortByBestRating(entries, (entry) => findRecommendationScore(findRating(entry), findEligibility(entry))) : entries),
    [catalog, findRating, findEligibility],
  );

  return useMemo(() => ({ canRate, isOn, setIsOn, catalog, findRating, rankRecommendedFirst }), [canRate, isOn, setIsOn, catalog, findRating, rankRecommendedFirst]);
}

/// Каталог — надбудова: якщо чанк не завантажився, пікер працює як без рекомендацій.
function useLoadedCatalog(isEnabled: boolean): WildshapeRatingCatalog | null {
  const [catalog, setCatalog] = useState<WildshapeRatingCatalog | null>(null);

  useEffect(() => {
    if (!isEnabled) return;
    let isCurrent = true;
    loadWildshapeRatingCatalog()
      .then((loaded) => {
        if (isCurrent) setCatalog(loaded);
      })
      .catch(() => undefined);
    return () => {
      isCurrent = false;
    };
  }, [isEnabled]);

  return catalog;
}
