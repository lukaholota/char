import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { SkillsEnum, type Skill } from "@/lib/types/enums";
import type { ReadyPresetSkillSources } from "./ready-preset-options";

type SkillChoices = NonNullable<PersFormData["skillsSchema"]>["basicChoices"];

export function buildReadyPresetSkillChoices(choices: SkillChoices, sources: ReadyPresetSkillSources) {
  const fixed = listFixedSkills(sources);
  const outsideBackground = new Set<Skill>([...sources.fixedRace, ...sources.fixedSubclass, ...choices.selectedClass, ...choices.race, ...(choices.subclass ?? [])]);
  const taken = new Set<Skill>([...fixed, ...outsideBackground]);
  const replacementCount = sources.customBackgroundSkillCount || sources.fixedBackground.filter((skill) => outsideBackground.has(skill)).length;
  const replacements = [...new Set([...choices.background, "PERCEPTION" as const, ...SkillsEnum])].filter((skill) => !taken.has(skill)).slice(0, replacementCount);
  const reconciled = { ...choices, background: replacements };
  return { choices: reconciled, skills: [...new Set([...fixed, ...Object.values(reconciled).flat()])] };
}

export function listFixedSkills(sources: ReadyPresetSkillSources): Skill[] {
  return [...sources.fixedRace, ...sources.fixedSubclass, ...sources.fixedBackground];
}

export function listAvailableSkillPicks(choices: SkillChoices, sources: ReadyPresetSkillSources) {
  const subclassPicks = choices.subclass ?? [];
  const alreadyGranted = [...sources.fixedRace, ...sources.fixedSubclass];
  return {
    selectedClass: sources.classOptions.filter((skill) => !alreadyGranted.includes(skill) && !subclassPicks.includes(skill)),
    race: sources.raceOptions.filter((skill) => !alreadyGranted.includes(skill) && !choices.selectedClass.includes(skill) && !subclassPicks.includes(skill)),
    subclass: sources.subclassOptions.filter((skill) => !alreadyGranted.includes(skill)),
  };
}

export type SkillPickGroup = keyof SkillChoices;

export function describeSkillPickGroup(group: SkillPickGroup, sources: ReadyPresetSkillSources): string {
  if (group === "selectedClass") return "Від класу";
  if (group === "race") return "Від раси";
  if (group === "subclass") return "Від підкласу";
  return sources.customBackgroundSkillCount ? "Навичка передісторії" : "Заміна повторної навички";
}

export function listSkillPickOptions(group: SkillPickGroup, sources: ReadyPresetSkillSources): readonly Skill[] {
  if (group === "selectedClass") return sources.classOptions;
  if (group === "race") return sources.raceOptions;
  if (group === "subclass") return sources.subclassOptions;
  return SkillsEnum;
}
