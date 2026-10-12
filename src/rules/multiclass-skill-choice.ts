import { findMulticlassProficiencies } from "./multiclass-proficiencies";
import { normalizeSkillProficiencies } from "./proficiency";

export const MULTICLASS_SKILL_SELECTION_KEY = "multiclass-entry";

export type MulticlassSkillChoice<Skill extends string> = { choiceCount: number; options: Skill[] };

export function findMulticlassSkillChoice<Skill extends string>(
  className: string,
  classSkillProficiencies: unknown,
  allSkills: readonly Skill[],
): MulticlassSkillChoice<Skill> | null {
  const choiceCount = findMulticlassProficiencies(className)?.skillChoiceCount ?? 0;
  if (choiceCount === 0) return null;
  const classSkills = normalizeSkillProficiencies(classSkillProficiencies, allSkills);
  return { choiceCount, options: classSkills?.type === "choice" ? classSkills.options : [...allSkills] };
}

type EntrySkillsInput<Skill extends string> = {
  className: string;
  classSkillProficiencies: unknown;
  allSkills: readonly Skill[];
  selected: readonly string[];
  knownSkills: readonly string[];
};

export function collectMulticlassEntrySkills<Skill extends string>(input: EntrySkillsInput<Skill>): { skills: Skill[]; problem: string | null } {
  const choice = findMulticlassSkillChoice(input.className, input.classSkillProficiencies, input.allSkills);
  if (!choice || input.selected.length === 0) return { skills: [], problem: null };
  const problem = findMulticlassSkillProblem(choice, input.selected, input.knownSkills);
  return problem ? { skills: [], problem } : { skills: input.selected as Skill[], problem: null };
}

export function countPickableMulticlassSkills<Skill extends string>(choice: MulticlassSkillChoice<Skill>, knownSkills: readonly string[]): number {
  const pickable = choice.options.filter((skill) => !knownSkills.includes(skill));
  return Math.min(choice.choiceCount, pickable.length);
}

export function findMulticlassSkillProblem<Skill extends string>(
  choice: MulticlassSkillChoice<Skill>,
  selected: readonly string[],
  knownSkills: readonly string[],
): string | null {
  if (new Set(selected).size !== selected.length) return "Навичку обрано двічі.";
  const unavailable = selected.find((skill) => !choice.options.includes(skill as Skill) || knownSkills.includes(skill));
  if (unavailable) return `Навичка ${unavailable} недоступна: її немає в списку класу або персонаж уже нею володіє.`;
  const required = countPickableMulticlassSkills(choice, knownSkills);
  if (selected.length !== required) return `Новий клас дає навичку на вибір: оберіть рівно ${required}.`;
  return null;
}
