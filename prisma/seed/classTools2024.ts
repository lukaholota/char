import { FeatureDisplayType, PrismaClient, Ruleset, ToolCategory } from "@prisma/client";
import classTools from "../../data/2024/normalized/class-tools.json";
import { CHOICE_GROUPS } from "../../src/lib/logic/choicePoolRules";
import { toolTranslations } from "../../src/lib/refs/translation";
import {
  linkChoiceOptionFeature,
  linkClassChoiceOption,
  upsertChoiceOption2024,
} from "./helpers/choiceOptions2024";

const RULESET: Ruleset = "RULES_2024";

export async function seedClassTools2024(prisma: PrismaClient) {
  let choices = 0;
  for (const entry of classTools.classes) {
    if (!entry.choiceCount) continue;
    const characterClass = await prisma.class.findUniqueOrThrow({
      where: { name_ruleset: { name: entry.className as never, ruleset: RULESET } },
      select: { classId: true },
    });
    for (const rawTool of entry.choices) {
      await seedToolChoice(prisma, characterClass.classId, entry.className, readToolCategory(rawTool));
      choices++;
    }
  }
  console.log(`Класові інструменти 2024: ${choices} опцій`);
}

async function seedToolChoice(
  prisma: PrismaClient,
  classId: number,
  className: string,
  tool: ToolCategory,
) {
  const name = toolTranslations[tool] ?? tool;
  const feature = await upsertToolFeature(prisma, tool, name);
  const choice = await upsertChoiceOption2024(prisma, {
    groupName: CHOICE_GROUPS.CLASS_TOOLS,
    optionName: name,
    optionNameEng: `Class Tool 2024 (${className}: ${tool})`,
  });
  await linkChoiceOptionFeature(prisma, choice.choiceOptionId, feature.featureId);
  await linkClassChoiceOption(prisma, {
    classId,
    choiceOptionId: choice.choiceOptionId,
    levelsGranted: [1],
  });
}

function upsertToolFeature(prisma: PrismaClient, tool: ToolCategory, name: string) {
  const engName = `Tool Proficiency: ${tool} (2024)`;
  const data = {
    name,
    description: `Ви володієте цим інструментом: ${name}.`,
    shortDescription: name,
    displayType: [FeatureDisplayType.PASSIVE],
    toolProficiencies: [tool],
    ruleset: RULESET,
  };
  return prisma.feature.upsert({ where: { engName }, update: data, create: { ...data, engName } });
}

function readToolCategory(value: string): ToolCategory {
  if (!(value in ToolCategory)) throw new Error(`Невідома категорія інструмента 2024: ${value}`);
  return ToolCategory[value as keyof typeof ToolCategory];
}
