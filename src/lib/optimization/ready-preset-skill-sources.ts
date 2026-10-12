import type { CreatorContent } from "@/server/db/creator-content-query";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { SkillsEnum, type Skill } from "@/lib/types/enums";
import { normalizeSkillProficiencies } from "@/rules/proficiency";
import { CUSTOMIZED_SKILL_COUNT } from "@/rules/background-customization";
import { collectSubclassSkillChoice } from "@/rules/subclass-skill-choices";

type Content = CreatorContent;
type CreatorClass = Content["classes"][number];
type CreatorSubclass = CreatorClass["subclasses"][number];

export type ReadyPresetSkillSources = {
  classCount: number; classOptions: Skill[]; raceCount: number; raceOptions: Skill[];
  fixedRace: Skill[]; fixedBackground: Skill[]; fixedSubclass: Skill[];
  customBackgroundSkillCount: number; subclassCount: number; subclassOptions: Skill[];
};

export type SkillSourcesInput = {
  characterClass: CreatorClass; race: Content["races"][number];
  variant: Content["races"][number]["raceVariants"][number] | undefined;
  subrace: Content["races"][number]["subraces"][number] | undefined;
  background: Content["backgrounds"][number];
  raceChoices: Content["races"][number]["raceChoiceOptions"];
  subclass: CreatorSubclass | undefined;
  draft: Partial<PersFormData>;
};

const FIRST_LEVEL = 1;
const SKILL_EFFECTS = ["SKILL_PROFICIENCY", "SKILL_EXPERTISE"];

export function buildSkillSources({ characterClass, race, variant, subrace, background, raceChoices, subclass, draft }: SkillSourcesInput): ReadyPresetSkillSources {
  const classSkills = normalizeSkillProficiencies(characterClass.skillProficiencies, SkillsEnum);
  if (classSkills?.type !== "choice") throw new Error(`Missing preset class skills: ${characterClass.name}`);
  const raceSources = [race.skillProficiencies, subrace?.skillProficiencies, ...raceChoices.map((option) => option.skillProficiencies)].map((source) => normalizeSkillProficiencies(source, SkillsEnum));
  const backgroundSkills = normalizeSkillProficiencies(background.skillProficiencies, SkillsEnum);
  const isBackgroundCustomized = !!draft.backgroundCustomization;
  const fixedRace = [...new Set(raceSources.flatMap((source) => source?.type === "fixed" ? source.skills : []))];
  const areRaceSkillsFree = draft.skillsSchema?.isTasha === true;
  const subclassChoice = collectSubclassSkillChoice(listFirstLevelSubclassSkillSources(subclass), SkillsEnum);
  return {
    classCount: classSkills.choiceCount, classOptions: classSkills.options,
    raceCount: raceSources.reduce((count, source) => count + (source?.type === "choice" ? source.choiceCount : 0), 0) + (variant?.name === "HUMAN_VARIANT" ? 1 : 0) + (areRaceSkillsFree ? fixedRace.length : 0),
    raceOptions: [...SkillsEnum], fixedRace: areRaceSkillsFree ? [] : fixedRace,
    fixedBackground: backgroundSkills?.type === "fixed" && !isBackgroundCustomized ? backgroundSkills.skills : [],
    fixedSubclass: [...new Set([...listFixedSubclassFeatureSkills(subclass), ...listChosenSubclassOptionSkills(subclass, draft)])],
    customBackgroundSkillCount: isBackgroundCustomized ? CUSTOMIZED_SKILL_COUNT : 0,
    subclassCount: subclassChoice.count, subclassOptions: subclassChoice.options as Skill[],
  };
}

function listFirstLevelSubclassSkillSources(subclass: CreatorSubclass | undefined): unknown[] {
  return (subclass?.features ?? []).filter((entry) => entry.levelGranted === FIRST_LEVEL).map((entry) => entry.feature.skillProficiencies);
}

function listFixedSubclassFeatureSkills(subclass: CreatorSubclass | undefined): Skill[] {
  return listFirstLevelSubclassSkillSources(subclass).flatMap((source) => {
    const normalized = normalizeSkillProficiencies(source, SkillsEnum);
    return normalized?.type === "fixed" ? normalized.skills : [];
  });
}

function listChosenSubclassOptionSkills(subclass: CreatorSubclass | undefined, draft: Partial<PersFormData>): Skill[] {
  const chosenIds = Object.values(draft.subclassChoiceSelections ?? {}).flat();
  return (subclass?.subclassChoiceOptions ?? [])
    .filter((entry) => chosenIds.includes(entry.choiceOptionId) && SKILL_EFFECTS.includes(String(entry.choiceOption.effectKind)))
    .map((entry) => entry.choiceOption.effectSkill)
    .filter((skill): skill is Skill => (SkillsEnum as readonly string[]).includes(String(skill)));
}
