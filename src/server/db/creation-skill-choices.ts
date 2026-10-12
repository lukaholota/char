import { Skills, ToolCategory } from "@prisma/client";
import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import { findBackgroundCustomizationProblem } from "@/rules/background-customization";
import { collectSubclassSkillChoice, findSubclassSkillChoiceProblem } from "@/rules/subclass-skill-choices";
import { parseOptionalNumber, parseStringArray } from "@/server/db/json";

type CreationSkillContent = {
  background: { name: string; toolProficiencies: unknown; languagesToChooseCount: unknown };
  features: ReadonlyArray<{ featureId: number; skillProficiencies: unknown }>;
  subclassFeatureIds: readonly number[];
};

const ALL_SKILLS = Object.values(Skills);
const ALL_TOOLS = Object.values(ToolCategory);

export function findCreationSkillChoiceProblem(data: PersFormData, content: CreationSkillContent): string | null {
  return findBackgroundCustomizationDraftProblem(data, content) ?? findSubclassSkillDraftProblem(data, content);
}

function findBackgroundCustomizationDraftProblem(data: PersFormData, content: CreationSkillContent): string | null {
  const customization = data.backgroundCustomization;
  if (!customization) return null;
  if ((data.ruleset ?? "RULES_2014") !== "RULES_2014") return "Налаштування передісторії доступне лише в правилах 2014";
  const { background } = content;
  return findBackgroundCustomizationProblem(
    { name: background.name, fixedTools: parseStringArray(background.toolProficiencies), languageChoiceCount: parseOptionalNumber(background.languagesToChooseCount) ?? 0 },
    customization,
    { skills: ALL_SKILLS, tools: ALL_TOOLS },
  );
}

function findSubclassSkillDraftProblem(data: PersFormData, content: CreationSkillContent): string | null {
  const picked = data.skillsSchema?.basicChoices.subclass;
  if (!picked) return null;
  const subclassFeatures = content.features.filter((feature) => content.subclassFeatureIds.includes(feature.featureId));
  const choice = collectSubclassSkillChoice(subclassFeatures.map((feature) => feature.skillProficiencies), ALL_SKILLS);
  return findSubclassSkillChoiceProblem(choice, picked);
}
