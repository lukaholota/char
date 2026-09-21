/**
 * Плоскі +5 рис PHB 2014: «Пильний» — до ініціативи, «Спостережливий» — до пасивних Уважності
 * й Розслідування. Рахуються з самої риси, а не пишуться в ручний бонус гравця. У 2024 ці риси
 * інші: «Пильний» дає бонус майстерності через фічу, «Спостережливий» — володіння навичкою.
 */

const ALERT_INITIATIVE_BONUS = 5;
const OBSERVANT_PASSIVE_BONUS = 5;
const OBSERVANT_PASSIVE_SKILLS: ReadonlySet<string> = new Set(["PERCEPTION", "INVESTIGATION"]);

export type OwnedFeat = { feat?: { name?: string | null; ruleset?: string | null } | null };

export function findAlertInitiativeBonus(feats: readonly OwnedFeat[]): number {
  return hasFeat2014(feats, "ALERT") ? ALERT_INITIATIVE_BONUS : 0;
}

export function findObservantPassiveBonus(feats: readonly OwnedFeat[], skill: string): number {
  if (!OBSERVANT_PASSIVE_SKILLS.has(skill)) return 0;
  return hasFeat2014(feats, "OBSERVANT") ? OBSERVANT_PASSIVE_BONUS : 0;
}

function hasFeat2014(feats: readonly OwnedFeat[], name: string): boolean {
  return feats.some((owned) => owned.feat?.name === name && owned.feat?.ruleset === "RULES_2014");
}
