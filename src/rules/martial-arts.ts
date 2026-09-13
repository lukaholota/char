import { isWornArmor } from "./armor";
import type { Ruleset } from "./types";

export type MonkWeaponCandidate = {
  name: string;
  weaponType: string;
  properties: readonly string[];
  isRanged: boolean;
};

export type DexterousAttacksInput = {
  featureEngNames: readonly string[];
  equippedArmorNames: readonly string[];
  wearsShield: boolean;
};

export const MARTIAL_ARTS_FEATURE_ENG_NAMES = ["Martial Arts", "Monk: Martial Arts (2024)"] as const;

export function canUseDexterousAttacks(input: DexterousAttacksInput): boolean {
  const hasMartialArts = input.featureEngNames.some((engName) =>
    (MARTIAL_ARTS_FEATURE_ENG_NAMES as readonly string[]).includes(engName),
  );
  return hasMartialArts && !input.wearsShield && !input.equippedArmorNames.some(isWornArmor);
}

export function isMonkWeapon(weapon: MonkWeaponCandidate, ruleset: Ruleset): boolean {
  if (weapon.name === "UNARMED_STRIKE") return true;
  if (weapon.isRanged) return false;
  return ruleset === "RULES_2024" ? isMonkWeapon2024(weapon) : isMonkWeapon2014(weapon);
}

function isMonkWeapon2024(weapon: MonkWeaponCandidate): boolean {
  if (weapon.weaponType === "SIMPLE_WEAPON") return true;
  return weapon.weaponType === "MARTIAL_WEAPON" && weapon.properties.includes("LIGHT");
}

// PHB 2014: «shortswords and any simple melee weapons that don't have the two-handed or heavy property».
function isMonkWeapon2014(weapon: MonkWeaponCandidate): boolean {
  if (weapon.name === "SHORTSWORD") return true;
  return (
    weapon.weaponType === "SIMPLE_WEAPON" &&
    !weapon.properties.includes("TWO_HANDED") &&
    !weapon.properties.includes("HEAVY")
  );
}

const MARTIAL_ARTS_DIE_FROM_MONK_LEVEL: Readonly<Record<Ruleset, readonly (readonly [minimumLevel: number, die: string])[]>> = {
  RULES_2014: [[17, "1d10"], [11, "1d8"], [5, "1d6"], [1, "1d4"]],
  RULES_2024: [[17, "1d12"], [11, "1d10"], [5, "1d8"], [1, "1d6"]],
};

export function findMartialArtsDie(ruleset: Ruleset, monkLevel: number): string | null {
  return MARTIAL_ARTS_DIE_FROM_MONK_LEVEL[ruleset].find(([minimumLevel]) => monkLevel >= minimumLevel)?.[1] ?? null;
}

// «You can roll the Martial Arts die in place of the normal damage» — гравець бере більший.
export function findMartialArtsDamageDice(weaponDamage: string, martialArtsDie: string): string {
  return findMaximumRoll(martialArtsDie) > findMaximumRoll(weaponDamage) ? martialArtsDie : weaponDamage;
}

function findMaximumRoll(damage: string): number {
  const match = damage.toLowerCase().replace(/к/g, "d").match(/(\d*)d(\d+)/);
  if (!match) return Number(damage) || 0;
  return Math.max(1, Number(match[1] || "1")) * Number(match[2]);
}
