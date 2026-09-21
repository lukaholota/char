import { Skills } from "@prisma/client";

export const PASSIVE_SKILLS: readonly { skill: Skills; label: string }[] = [
  { skill: Skills.PERCEPTION, label: "Пасивна уважність" },
  { skill: Skills.INVESTIGATION, label: "Пасивне розслідування" },
  { skill: Skills.INSIGHT, label: "Пасивний аналіз поведінки" },
];

export function findPassiveSkillLabel(skill: Skills): string {
  return PASSIVE_SKILLS.find((entry) => entry.skill === skill)?.label ?? skill;
}
