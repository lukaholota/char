"use client";

import { useEffect, useMemo } from "react";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import { findRaceSpellChoice2014 } from "@/rules/race-spell-choices-2014";

type RaceWithOptions = { name: string; ruleset?: string; raceChoiceOptions?: readonly { optionId: number; optionName: string }[] };

/** Чи раса 2014 дає обрати замовляння; вибір, що лишився від іншої раси чи спадку, прибирається — інакше сервер відмовить. */
export function useCreationRaceSpellStep(race: RaceWithOptions | undefined, subrace: { name: string } | undefined): boolean {
  const { formData, updateFormData, isHydrated } = usePersFormStore();
  const selectedOptionKey = Object.values(formData.raceChoiceSelections ?? {}).join(",");

  const hasRaceSpellChoice = useMemo(() => {
    if (!race || race.ruleset === "RULES_2024") return false;
    const selectedOptionIds = new Set(selectedOptionKey.split(",").map(Number));
    const chosenRaceOptionNames = (race.raceChoiceOptions ?? []).filter((option) => selectedOptionIds.has(option.optionId)).map((option) => option.optionName);
    return findRaceSpellChoice2014({ race: race.name, subrace: subrace?.name ?? null, chosenRaceOptionNames }) !== null;
  }, [race, subrace, selectedOptionKey]);

  const hasStaleSelection = isHydrated && !hasRaceSpellChoice && (formData.raceSpellIds?.length ?? 0) > 0;
  useEffect(() => {
    if (hasStaleSelection) updateFormData({ raceSpellIds: [] });
  }, [hasStaleSelection, updateFormData]);

  return hasRaceSpellChoice;
}
