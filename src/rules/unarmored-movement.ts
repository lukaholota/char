import { isWornArmor } from "./armor";

export type UnarmoredMovementInput = {
  monkLevel: number;
  equippedArmorNames: readonly string[];
  wearsShield: boolean;
};

export const MONK_CLASS_NAMES = ["MONK_2014", "MONK_2024"] as const;

// Колонка «Unarmored Movement» таблиці Монаха 2024 і текст риси 2014 збігаються.
const BONUS_FROM_MONK_LEVEL: readonly (readonly [minimumLevel: number, bonus: number])[] = [
  [18, 30],
  [14, 25],
  [10, 20],
  [6, 15],
  [2, 10],
];

export function findUnarmoredMovementBonus(input: UnarmoredMovementInput): number {
  if (input.wearsShield || input.equippedArmorNames.some(isWornArmor)) return 0;
  return BONUS_FROM_MONK_LEVEL.find(([minimumLevel]) => input.monkLevel >= minimumLevel)?.[1] ?? 0;
}
