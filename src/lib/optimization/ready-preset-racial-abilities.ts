import type { CreatorContent } from "@/server/db/creator-content-query";
import { extractFlexibleGroups } from "@/rules/abilities";
import { findRacialAbilityChoiceProblem, findRacialAbilityMode, listRacialChoiceGroups, splitRacialAbilityChoices, type RacialAbilityMode } from "@/rules/racial-ability-choices";

type CreatorRace = CreatorContent["races"][number];
type RaceParts = { race: CreatorRace; variant: CreatorRace["raceVariants"][number] | undefined; subrace: CreatorRace["subraces"][number] | undefined };
type PresetRacialRules<Ability extends string = string> = { racialAbilities: Ability[]; racialAbilityRules?: "tasha" };

export function findPresetRacialAbilityMode(preset: Pick<PresetRacialRules, "racialAbilityRules">): RacialAbilityMode {
  return findRacialAbilityMode(preset.racialAbilityRules !== "tasha");
}

export function listPresetRacialGroups({ race, variant, subrace }: RaceParts, mode: RacialAbilityMode): unknown[] {
  if (mode === "basic") return extractFlexibleGroups(variant?.overridesRaceASI ?? race.ASI, "basic");
  return listRacialChoiceGroups({ isDefaultASI: false, raceASI: race.ASI, variantASI: variant?.overridesRaceASI, subraceASI: subrace?.additionalASI, subraceReplacesASI: subrace?.replacesASI ?? false });
}

export function findPresetRacialAbilityProblem(parts: RaceParts, preset: PresetRacialRules): string | null {
  const mode = findPresetRacialAbilityMode(preset);
  const groups = listPresetRacialGroups(parts, mode);
  if (mode === "tasha" && !groups.length) return "Раса не має виборів підвищень за правилами Таші, тож racialAbilityRules: \"tasha\" тут не потрібне";
  return findRacialAbilityChoiceProblem(groups, preset.racialAbilities, mode);
}

export function buildPresetRacialAbilityDraft<Ability extends string>(parts: RaceParts, preset: PresetRacialRules<Ability>) {
  const problem = findPresetRacialAbilityProblem(parts, preset);
  if (problem) throw new Error(`Incomplete preset racial ability choices: ${problem}`);
  const mode = findPresetRacialAbilityMode(preset);
  const choices = splitRacialAbilityChoices(listPresetRacialGroups(parts, mode), preset.racialAbilities);
  return {
    isDefaultASI: mode === "basic",
    racialBonusChoiceSchema: mode === "basic" ? { basicChoices: choices, tashaChoices: [] } : { basicChoices: [], tashaChoices: choices },
  };
}
