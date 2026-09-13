import { ArmorType, FeatureDisplayType, Prisma, PrismaClient, WeaponType } from "@prisma/client";
import source from "../../data/2024/normalized/class-choices.json";
import { linkChoiceOptionFeature, linkClassChoiceOption, upsertChoiceOption2024 } from "./helpers/choiceOptions2024";

type SourceOption = (typeof source.groups)[number]["options"][number] & {
  armorProficiencies?: string[];
  weaponProficiencies?: { type: string[] };
};

export async function seedClassChoices2024(prisma: PrismaClient) {
  let optionCount = 0;

  for (const group of source.groups) {
    const characterClass = await prisma.class.findUniqueOrThrow({
      where: { name_ruleset: { name: group.className as never, ruleset: "RULES_2024" } },
      select: { classId: true },
    });
    const levelsGranted = Object.keys(group.picksAtLevel).map(Number);

    for (const option of group.options as SourceOption[]) {
      const key = `${option.engName} (2024)`;
      const feature = await prisma.feature.upsert({
        where: { engName: `Class Choice Feature: ${key}` },
        update: featurePayload(option),
        create: { engName: `Class Choice Feature: ${key}`, ...featurePayload(option) },
      });
      const choice = await upsertChoiceOption2024(prisma, {
        groupName: group.groupName,
        optionName: option.name,
        optionNameEng: key,
      });
      await linkChoiceOptionFeature(prisma, choice.choiceOptionId, feature.featureId);
      await linkClassChoiceOption(prisma, { classId: characterClass.classId, choiceOptionId: choice.choiceOptionId, levelsGranted });
      optionCount += 1;
    }
  }

  console.log(`Класові вибори 2024: ${source.groups.length} груп, ${optionCount} опцій`);
}

function featurePayload(option: SourceOption) {
  return {
    name: option.name,
    description: option.description,
    shortDescription: option.description,
    displayType: [FeatureDisplayType.PASSIVE],
    armorProficiencies: (option.armorProficiencies ?? []) as ArmorType[],
    weaponProficiencies: option.weaponProficiencies
      ? { type: option.weaponProficiencies.type as WeaponType[] } as Prisma.InputJsonValue
      : Prisma.JsonNull,
    ruleset: "RULES_2024" as const,
  };
}
