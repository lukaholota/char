import { useMemo } from "react";
import type { RaceVariant } from "@prisma/client";
import { usePersFormStore } from "@/lib/stores/persFormStore";
import type { BackgroundI, FeatPrisma, RaceI } from "@/lib/types/model-types";
import { buildCreationAbilityScores, type CreationAbilityInput } from "@/rules/character-creation";
import { ABILITY_KEYS } from "@/rules/feat-grants";
import type { AbilityKey, Ruleset } from "@/rules/types";

type Props = {
  ruleset?: Ruleset;
  race?: RaceI;
  raceVariant?: RaceVariant | null;
  background?: BackgroundI;
  backgroundFeat?: FeatPrisma | null;
  speciesFeat?: FeatPrisma | null;
  feat?: FeatPrisma | null;
};

type StatPreview = {
  base: number;
  bonus: number;
  total: number;
  mod: number;
  breakdown: Array<{ source: string; value: number }>;
};

export function useCharacterStats({ ruleset, race, raceVariant, background, backgroundFeat, speciesFeat, feat }: Props) {
  const formData = usePersFormStore((state) => state.formData);
  return useMemo(() => {
    const subrace = race?.subraces.find((candidate) => candidate.subraceId === formData.subraceId);
    const input: CreationAbilityInput = {
      ruleset: ruleset ?? formData.ruleset ?? "RULES_2014",
      asiSystem: formData.asiSystem ?? "POINT_BUY",
      pointBuy: formData.asi ?? [], simple: formData.simpleAsi ?? [], custom: formData.customAsi,
      isDefaultASI: formData.isDefaultASI ?? true,
      raceASI: race?.ASI, variantASI: raceVariant?.overridesRaceASI,
      subraceASI: subrace?.additionalASI, subraceReplacesASI: Boolean(subrace?.replacesASI),
      racialChoices: formData.racialBonusChoiceSchema,
      raceChoiceAbilityBonuses: Object.values(formData.raceChoiceSelections ?? {}).flatMap((id) => {
        const choice = race?.raceChoiceOptions.find((candidate) => candidate.optionId === id);
        return choice ? [{ ASI: choice.ASI }] : [];
      }),
      backgroundAbilityOptions: background?.abilityOptions,
      backgroundAsiChoice: formData.backgroundAsiChoice,
      feats: [
        { feat, selections: formData.featChoiceSelections },
        { feat: backgroundFeat, selections: formData.backgroundFeatChoiceSelections },
        { feat: speciesFeat, selections: formData.speciesFeatChoiceSelections },
      ].flatMap(({ feat: chosen, selections }) => chosen ? [{ source: chosen, chosenOptionIds: [...new Set(Object.values(selections ?? {}).flat())] }] : []),
    };
    const base = buildCreationAbilityScores({ ...input, raceASI: null, variantASI: null, subraceASI: null,
      racialChoices: undefined, raceChoiceAbilityBonuses: [], backgroundAsiChoice: undefined, feats: [] }).scores;
    const species = buildCreationAbilityScores({ ...input, backgroundAsiChoice: undefined, feats: [] }).scores;
    const origin = buildCreationAbilityScores({ ...input, feats: [] }).scores;
    const final = buildCreationAbilityScores(input).scores;
    return Object.fromEntries(ABILITY_KEYS.map((ability) => [ability, {
      base: base[ability], bonus: final[ability] - base[ability], total: final[ability],
      mod: Math.floor((final[ability] - 10) / 2),
      breakdown: [
        { source: "За расу", value: species[ability] - base[ability] },
        { source: "За походження", value: origin[ability] - species[ability] },
        { source: "За риси", value: final[ability] - origin[ability] },
      ].filter((entry) => entry.value !== 0),
    }])) as Record<AbilityKey, StatPreview>;
  }, [formData, ruleset, race, raceVariant, background, backgroundFeat, speciesFeat, feat]);
}
