import { SkillsEnum, type Skill } from "@/lib/types/enums";
import type { ClassI } from "@/lib/types/model-types";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { normalizeSkillProficiencies } from "@/rules/proficiency";
import { collectSubclassSkillChoice } from "@/rules/subclass-skill-choices";
import type { SkillPickGroup } from "./skills-step-hint";

export type SubclassSkillPicks = { count: number; options: Skill[]; fixed: Skill[] };
export type SubclassSkillGroup = { options: Skill[]; chosen: Skill[]; required: number };

const FIRST_LEVEL = 1;
const NO_SUBCLASS_SKILLS: SubclassSkillPicks = { count: 0, options: [], fixed: [] };

/// Як і сервер, дивиться лише риси підкласу 1-го рівня: у 2024 підклас приходить на 3-му.
export function findSubclassSkillPicks(selectedClass: ClassI, subclassId: number | undefined): SubclassSkillPicks {
  if (selectedClass.ruleset === "RULES_2024") return NO_SUBCLASS_SKILLS;
  const subclass = selectedClass.subclasses?.find((entry) => entry.subclassId === subclassId);
  const sources = (subclass?.features ?? []).filter((entry) => entry.levelGranted === FIRST_LEVEL).map((entry) => entry.feature.skillProficiencies);
  const choice = collectSubclassSkillChoice(sources, SkillsEnum);
  return { count: choice.count, options: choice.options.filter(isSkill), fixed: listFixedSkills(sources) };
}

/// Вибір іншого підкласу чи навичка, що тепер приходить звідкись іще, не доживає до збереження.
export function findSubclassSkillGroup(picks: SubclassSkillPicks, picked: readonly Skill[] | undefined, ownedOutsideGroups: readonly Skill[]): SubclassSkillGroup {
  const open = picks.options.filter((skill) => !ownedOutsideGroups.includes(skill));
  const chosen = [...new Set(picked ?? [])].filter((skill) => open.includes(skill)).slice(0, picks.count);
  return { options: picks.options, chosen, required: Math.min(picks.count, open.length) };
}

/// Сервер вимагає рівно стільки навичок із переліку, скільки дає риса. Коли всі вони вже є
/// з раси чи передісторії, зберігаємо повтор: володіння від нього не подвоюється.
export function settleSubclassPicks(picks: SubclassSkillPicks, picked: readonly Skill[] | undefined, ownedOutsideGroups: readonly Skill[]): Skill[] {
  const { chosen } = findSubclassSkillGroup(picks, picked, ownedOutsideGroups);
  const alreadyOwned = picks.options.filter((skill) => ownedOutsideGroups.includes(skill));
  return [...chosen, ...alreadyOwned].slice(0, picks.count);
}

type SkillsDraft = Partial<Pick<PersFormData, "subclassId" | "skills" | "skillsSchema">>;

/// Навички іншого підкласу не мають доїхати до сервера, навіть якщо гравець перескочить крок
/// «Навички». Коли новий підклас сам просить навичку, крок знову стає незавершеним.
export function buildSkillsAfterSubclassSwitch(selectedClass: ClassI, draft: SkillsDraft, nextSubclassId: number | undefined): SkillsDraft {
  const schema = draft.skillsSchema;
  if (!schema) return {};
  const previous = findSubclassSkillPicks(selectedClass, draft.subclassId);
  const next = findSubclassSkillPicks(selectedClass, nextSubclassId);
  const isSkillsStepAffected = previous.count > 0 || previous.fixed.length > 0 || next.count > 0 || (schema.basicChoices.subclass?.length ?? 0) > 0;
  if (!isSkillsStepAffected) return {};

  const { subclass: droppedPicks = [], ...otherGroups } = schema.basicChoices;
  const keptElsewhere = new Set<string>([...otherGroups.race, ...otherGroups.selectedClass, ...otherGroups.background, ...schema.tashaChoices, ...Object.values(schema.choiceOptions).flat()]);
  const dropped = new Set<string>([...droppedPicks, ...previous.fixed].filter((skill) => !keptElsewhere.has(skill)));
  return {
    skillsSchema: { ...schema, basicChoices: otherGroups },
    skills: next.count > 0 ? [] : (draft.skills ?? []).filter((skill) => !dropped.has(skill)),
  };
}

export function buildSubclassPickGroup(group: SubclassSkillGroup, isTakenByOtherGroup: (skill: Skill) => boolean): SkillPickGroup {
  const canPickMore = group.options.some((skill) => !group.chosen.includes(skill) && !isTakenByOtherGroup(skill));
  return { chosen: group.chosen.length, required: group.required, source: "підкласу", isTakenByOtherGroups: !canPickMore };
}

function listFixedSkills(sources: readonly unknown[]): Skill[] {
  const fixed = sources.flatMap((source) => {
    const normalized = normalizeSkillProficiencies(source, SkillsEnum);
    return normalized?.type === "fixed" ? normalized.skills : [];
  });
  return [...new Set(fixed)];
}

function isSkill(value: string): value is Skill {
  return (SkillsEnum as readonly string[]).includes(value);
}
