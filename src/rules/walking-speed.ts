export type WalkingSpeedInput = {
  baseSpeed?: number | null;
  variantSpeedOverride?: number | null;
  subraceSpeedModifier?: number | null;
  choiceSpeedModifiers?: readonly (number | null | undefined)[];
  featureSpeedBonus?: number | null;
  unarmoredMovementBonus?: number | null;
  manualSpeedBonus?: number | null;
  replacementSpeed?: number | null;
};

export type WalkingSpeedPartKey =
  | "REPLACEMENT"
  | "SPECIES"
  | "VARIANT"
  | "SUBRACE"
  | "SPECIES_CHOICES"
  | "FEATURES"
  | "UNARMORED_MOVEMENT"
  | "MANUAL";

export type WalkingSpeedPart = { key: WalkingSpeedPartKey; value: number };

export function calculateWalkingSpeed(input: WalkingSpeedInput): number {
  return Math.max(0, explainWalkingSpeed(input).reduce((total, part) => total + part.value, 0));
}

// Дика форма заміщує рух персонажа, а не додає його до звіриного.
export function explainWalkingSpeed(input: WalkingSpeedInput): WalkingSpeedPart[] {
  const replacementSpeed = toFiniteInteger(input.replacementSpeed);
  if (replacementSpeed !== null) return [{ key: "REPLACEMENT", value: replacementSpeed }];

  const variantSpeed = toFiniteInteger(input.variantSpeedOverride);
  return [
    variantSpeed !== null ? { key: "VARIANT", value: variantSpeed } : { key: "SPECIES", value: toFiniteInteger(input.baseSpeed) ?? 30 },
    { key: "SUBRACE", value: toFiniteInteger(input.subraceSpeedModifier) ?? 0 },
    { key: "SPECIES_CHOICES", value: sumFiniteIntegers(input.choiceSpeedModifiers) },
    { key: "FEATURES", value: toFiniteInteger(input.featureSpeedBonus) ?? 0 },
    { key: "UNARMORED_MOVEMENT", value: toFiniteInteger(input.unarmoredMovementBonus) ?? 0 },
    { key: "MANUAL", value: toFiniteInteger(input.manualSpeedBonus) ?? 0 },
  ];
}

function sumFiniteIntegers(values: readonly (number | null | undefined)[] | undefined): number {
  return (values ?? []).reduce<number>((total, value) => total + (toFiniteInteger(value) ?? 0), 0);
}

function toFiniteInteger(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
}
