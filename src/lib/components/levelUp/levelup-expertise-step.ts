import { isExpertiseChosenThroughSubclassOptions, readExpertiseGrant, type SubclassExpertiseOption } from "@/rules/expertise-selections";

type LevelFeature = { engName?: string | null; skillExpertises?: unknown };
type SubclassChoiceOption = { levelsGranted?: readonly number[] | null; choiceOption?: { groupName?: string | null; effectKind?: string | null } | null };

export function hasLevelUpExpertiseChoice(input: {
  features: readonly LevelFeature[];
  subclassChoiceOptions: readonly SubclassChoiceOption[];
  classLevelAfter: number;
}): boolean {
  const subclassOptionsAtLevel = listSubclassOptionsAtLevel(input.subclassChoiceOptions, input.classLevelAfter);
  return input.features.some((feature) =>
    readExpertiseGrant(feature.skillExpertises) !== null
    && !isExpertiseChosenThroughSubclassOptions({ engName: feature.engName ?? null }, subclassOptionsAtLevel));
}

function listSubclassOptionsAtLevel(options: readonly SubclassChoiceOption[], classLevel: number): SubclassExpertiseOption[] {
  return options
    .filter((option) => (option.levelsGranted ?? []).includes(classLevel))
    .map((option) => ({
      groupName: String(option.choiceOption?.groupName ?? ""),
      effectKind: option.choiceOption?.effectKind ? String(option.choiceOption.effectKind).toUpperCase() : null,
    }));
}
