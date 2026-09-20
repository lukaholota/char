import type { AbilityScores } from "@/rules/types";

export type SheetFeatExistingState = {
  skills: string[];
  expertises: string[];
  choiceOptionIds: number[];
  abilityScores: AbilityScores;
};

type ExistingStateSource = {
  str: number; dex: number; con: number; int: number; wis: number; cha: number;
  skills: readonly { name: string; proficiencyType: string }[];
  choiceOptions: readonly { choiceOptionId: number }[];
};

export function findSheetFeatExistingState(pers: ExistingStateSource): SheetFeatExistingState {
  return {
    skills: pers.skills.filter((skill) => skill.proficiencyType !== "NONE").map((skill) => skill.name),
    expertises: pers.skills.filter((skill) => skill.proficiencyType === "EXPERTISE").map((skill) => skill.name),
    choiceOptionIds: pers.choiceOptions.map((option) => option.choiceOptionId),
    abilityScores: { STR: pers.str, DEX: pers.dex, CON: pers.con, INT: pers.int, WIS: pers.wis, CHA: pers.cha },
  };
}
