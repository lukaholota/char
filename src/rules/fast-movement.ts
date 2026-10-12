export type FastMovementInput = {
  ownedFeatureEngNames: readonly string[];
  wearsHeavyArmor: boolean;
};

const FAST_MOVEMENT_ENG_NAMES = ["Fast Movement", "Barbarian: Fast Movement (2024)"] as const;
const FAST_MOVEMENT_SPEED_BONUS = 10;

export function findFastMovementBonus(input: FastMovementInput): number {
  const ownsFastMovement = FAST_MOVEMENT_ENG_NAMES.some((engName) => input.ownedFeatureEngNames.includes(engName));
  return ownsFastMovement && !input.wearsHeavyArmor ? FAST_MOVEMENT_SPEED_BONUS : 0;
}
