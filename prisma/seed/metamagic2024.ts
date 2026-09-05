import { FeatureDisplayType, PrismaClient } from "@prisma/client";
import metamagic from "../../data/2024/normalized/metamagic.json";
import { CHOICE_GROUPS } from "../../src/lib/logic/choicePoolRules";
import { linkChoiceOptionFeature, linkClassChoiceOption, upsertChoiceOption2024 } from "./helpers/choiceOptions2024";

export async function seedMetamagic2024(prisma: PrismaClient) {
  const sorcerer = await prisma.class.findUniqueOrThrow({
    where: { name_ruleset: { name: "SORCERER_2024", ruleset: "RULES_2024" } },
  });
  for (const option of metamagic.options) await seedMetamagicOption(prisma, sorcerer.classId, option);
  for (const level of metamagic.levelsGranted.slice(1)) await seedAdditionalMetamagic(prisma, sorcerer.classId, level);
  console.log(`Метамагія 2024: ${metamagic.options.length} опцій, рівні ${metamagic.levelsGranted.join(", ")}`);
}

async function seedMetamagicOption(prisma: PrismaClient, classId: number, option: typeof metamagic.options[number]) {
  const engName = `${option.engName} (2024)`;
  const choice = await upsertChoiceOption2024(prisma, {
    groupName: CHOICE_GROUPS.SORCERER_METAMAGIC, optionName: option.name, optionNameEng: engName,
  });
  const feature = await upsertMetamagicFeature(prisma, {
    engName, name: option.name,
    description: `Вартість в очках чародійства: ${option.cost}.\n\n${option.description}`,
  });
  await linkChoiceOptionFeature(prisma, choice.choiceOptionId, feature.featureId);
  await linkClassChoiceOption(prisma, {
    classId, choiceOptionId: choice.choiceOptionId, levelsGranted: metamagic.levelsGranted,
  });
}

async function seedAdditionalMetamagic(prisma: PrismaClient, classId: number, level: number) {
  const feature = await upsertMetamagicFeature(prisma, {
    ...metamagic.additionalGrant, engName: `Sorcerer: Additional Metamagic L${level} (2024)`,
  });
  const grant = { classId, featureId: feature.featureId, levelGranted: level, ruleset: "RULES_2024" as const };
  await prisma.classFeature.upsert({
    where: { classId_featureId: { classId, featureId: feature.featureId } }, update: grant, create: grant,
  });
}

function upsertMetamagicFeature(prisma: PrismaClient, feature: { engName: string; name: string; description: string }) {
  const payload = {
    ...feature, shortDescription: feature.name, ruleset: "RULES_2024" as const,
    displayType: [FeatureDisplayType.PASSIVE],
  };
  return prisma.feature.upsert({ where: { engName: feature.engName }, update: payload, create: payload });
}
