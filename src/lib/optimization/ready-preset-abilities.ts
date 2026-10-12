import type { CreatorContent } from "@/server/db/creator-content-query";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { buildCreationAbilityScores } from "@/rules/character-creation";

export function buildPresetAbilitySources(draft: Partial<PersFormData>, content: CreatorContent) {
  const race = content.races.find((entry) => entry.raceId === draft.raceId)!;
  const variant = race.raceVariants.find((entry) => entry.raceVariantId === draft.raceVariantId);
  const subrace = race.subraces.find((entry) => entry.subraceId === draft.subraceId);
  const feat = content.feats.find((entry) => entry.featId === draft.featId);
  return { raceASI: race.ASI, variantASI: variant?.overridesRaceASI, subraceASI: subrace?.additionalASI, subraceReplacesASI: subrace?.replacesASI ?? false,
    feats: feat ? [{ source: { name: feat.name, ruleset: feat.ruleset, grantedASI: feat.grantedASI, grantedSkills: feat.grantedSkills,
      featChoiceOptions: feat.featChoiceOptions.map((entry) => ({ choiceOptionId: entry.choiceOptionId, choiceOption: { effectKind: entry.choiceOption.effectKind, effectAbility: entry.choiceOption.effectAbility, effectAmount: entry.choiceOption.effectAmount } })) },
      chosenOptionIds: Object.values(draft.featChoiceSelections ?? {}).flat() }] : [],
  };
}
export type PresetAbilitySources = ReturnType<typeof buildPresetAbilitySources>;

export function buildPresetAbilityScores(draft: Partial<PersFormData>, sources: PresetAbilitySources) {
  return buildCreationAbilityScores({ ...sources, ruleset: "RULES_2014", asiSystem: "POINT_BUY", pointBuy: draft.asi ?? [], simple: [],
    isDefaultASI: draft.isDefaultASI ?? true, racialChoices: draft.racialBonusChoiceSchema }).scores;
}

export function findPresetIntelligence(draft: Partial<PersFormData>, sources: PresetAbilitySources): number {
  return buildPresetAbilityScores(draft, sources).INT;
}

export function listPresetChosenRacialBonuses(draft: Partial<PersFormData>, sources: PresetAbilitySources): { ability: keyof ReturnType<typeof buildPresetAbilityScores>; bonus: number }[] {
  const withChoices = buildPresetAbilityScores(draft, sources);
  const withoutChoices = buildPresetAbilityScores({ ...draft, racialBonusChoiceSchema: undefined }, sources);
  return (Object.keys(withChoices) as (keyof typeof withChoices)[]).map((ability) => ({ ability, bonus: withChoices[ability] - withoutChoices[ability] })).filter((entry) => entry.bonus > 0);
}
