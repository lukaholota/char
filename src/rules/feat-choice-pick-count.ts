export type FeatChoiceGroupKind = {
  isSkill: boolean;
  isAbility: boolean;
  isManeuver: boolean;
};

const DEFAULT_SKILLED_PICKS = 3;
const MARTIAL_ADEPT_MANEUVER_PICKS = 2;
const ENERGY_RESISTANCE_DAMAGE_TYPE_PICKS = 2;
const METAMAGIC_ADEPT_PICKS = 2;

export function findFeatChoicePickCount(
  feat: { name?: string | null; grantedSkillCount?: number | null } | null | undefined,
  group: FeatChoiceGroupKind,
): number {
  if (feat?.name === "SKILLED" && group.isSkill) return feat.grantedSkillCount || DEFAULT_SKILLED_PICKS;
  if (feat?.name === "MARTIAL_ADEPT" && group.isManeuver) return MARTIAL_ADEPT_MANEUVER_PICKS;
  // «Resistance to two of the following damage types» — друга група риси це підвищення характеристики.
  if (feat?.name === "BOON_OF_ENERGY_RESISTANCE" && !group.isAbility) return ENERGY_RESISTANCE_DAMAGE_TYPE_PICKS;
  if (feat?.name === "METAMAGIC_ADEPT") return METAMAGIC_ADEPT_PICKS;
  return 1;
}

export function findMetamagicAdeptPickProblem(chosenOptionIds: readonly number[]): string | null {
  const hasExactlyTwoDistinct = new Set(chosenOptionIds).size === METAMAGIC_ADEPT_PICKS && chosenOptionIds.length === METAMAGIC_ADEPT_PICKS;
  return hasExactlyTwoDistinct ? null : "Оберіть дві різні метамагії";
}
