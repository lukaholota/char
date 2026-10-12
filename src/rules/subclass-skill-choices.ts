import { normalizeSkillProficiencies } from "@/rules/proficiency";

export type SubclassSkillChoice = { count: number; options: string[] };

export function collectSubclassSkillChoice(featureSkillProficiencies: readonly unknown[], allSkills: readonly string[]): SubclassSkillChoice {
  const choices = featureSkillProficiencies.flatMap((value) => {
    const normalized = normalizeSkillProficiencies(value, allSkills);
    return normalized?.type === "choice" ? [normalized] : [];
  });
  return {
    count: choices.reduce((total, choice) => total + choice.choiceCount, 0),
    options: [...new Set(choices.flatMap((choice) => choice.options))],
  };
}

export function findSubclassSkillChoiceProblem(choice: SubclassSkillChoice, picked: readonly string[]): string | null {
  if (picked.length !== choice.count) return `Підклас дає обрати навичок: ${choice.count}, а в чернетці ${picked.length}`;
  if (new Set(picked).size !== picked.length) return "Навички підкласу містять повтор";
  const outside = picked.find((skill) => !choice.options.includes(skill));
  return outside ? `Підклас не дає обрати навичку ${outside}` : null;
}
