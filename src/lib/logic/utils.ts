export function getAbilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function getProficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export const skillAbilityMap: Record<string, string> = {
  ATHLETICS: "str",
  ACROBATICS: "dex",
  SLEIGHT_OF_HAND: "dex",
  STEALTH: "dex",
  ARCANA: "int",
  HISTORY: "int",
  INVESTIGATION: "int",
  NATURE: "int",
  RELIGION: "int",
  ANIMAL_HANDLING: "wis",
  INSIGHT: "wis",
  MEDICINE: "wis",
  PERCEPTION: "wis",
  SURVIVAL: "wis",
  DECEPTION: "cha",
  INTIMIDATION: "cha",
  PERFORMANCE: "cha",
  PERSUASION: "cha",
};
