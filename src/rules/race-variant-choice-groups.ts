// ERLW: a dragonmarked half-elf's traits come "in place of the half-elf's Ability Score Increase and
// Skill Versatility traits", and the SCAG versatility group is itself a swap for Skill Versatility.
const CHOICE_GROUPS_REPLACED_BY_VARIANT: Record<string, readonly string[]> = {
  HALF_ELF_MARK_OF_DETECTION_EBERRON: ["Універсальність напівельфа"],
  HALF_ELF_MARK_OF_STORM_EBERRON: ["Універсальність напівельфа"],
};

export function isRaceChoiceGroupReplacedByVariant(variantName: string | null | undefined, groupName: string): boolean {
  return Boolean(variantName && CHOICE_GROUPS_REPLACED_BY_VARIANT[variantName]?.includes(groupName));
}

export function keepRaceChoiceOptionsOfVariant<Option extends { choiceGroupName: string }>(options: readonly Option[], variantName: string | null | undefined): Option[] {
  return options.filter((option) => !isRaceChoiceGroupReplacedByVariant(variantName, option.choiceGroupName));
}
