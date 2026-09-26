// Багряний обряд мисливця за кровʼю (Blood Hunter 2020): бонусною дією на одну зброю, до відпочинку.
// «Attacks you make with this weapon are magical, and deal extra damage equal to your hemocraft die of the
// type determined by the chosen rite. A weapon can hold only one active rite at a time.»
// Обряд — це риса: вивчений варіант групи «Багряні обряди» або Обряд світанку мисливця на привидів.

import type { DamageTypeKey } from "./types";

export type CrimsonRiteDamage = { dice: string; damageType: DamageTypeKey };

const RITE_DAMAGE_TYPES: Readonly<Record<string, DamageTypeKey>> = {
  "Rite of the Flame": "FIRE",
  "Rite of the Frozen": "COLD",
  "Rite of the Storm": "LIGHTNING",
  "Rite of the Dead": "NECROTIC",
  "Rite of the Oracle": "PSYCHIC",
  "Rite of the Roar": "THUNDER",
  "Rite of the Dawn": "RADIANT",
};

/// Кубик гемокрафту за рівнем мисливця: к4, к6 з 5-го, к8 з 11-го, к10 з 17-го.
const HEMOCRAFT_DIE_FROM_LEVEL: readonly (readonly [minimumLevel: number, die: string])[] = [
  [17, "1d10"],
  [11, "1d8"],
  [5, "1d6"],
  [1, "1d4"],
];

export function findHemocraftDie(bloodHunterLevel: number): string | null {
  return HEMOCRAFT_DIE_FROM_LEVEL.find(([minimumLevel]) => bloodHunterLevel >= minimumLevel)?.[1] ?? null;
}

/// Назва риси обряду в будь-якій редакції: «Rite of the Storm», «Blood Hunter Choice: Rite of the Storm (2024)»,
/// «Rite of the Dawn (Order of the Ghostslayer)», «Order of the Ghostslayer: Rite of the Dawn (2024)».
export function findRiteDamageType(featureEngName: string | null | undefined): DamageTypeKey | null {
  const riteName = String(featureEngName ?? "").match(/Rite of the \w+/)?.[0];
  return riteName ? (RITE_DAMAGE_TYPES[riteName] ?? null) : null;
}

export function isCrimsonRiteFeature(featureEngName: string | null | undefined): boolean {
  return findRiteDamageType(featureEngName) !== null;
}

export function findCrimsonRiteDamage(featureEngName: string | null | undefined, bloodHunterLevel: number): CrimsonRiteDamage | null {
  const damageType = findRiteDamageType(featureEngName);
  const dice = findHemocraftDie(bloodHunterLevel);
  return damageType && dice ? { dice, damageType } : null;
}
