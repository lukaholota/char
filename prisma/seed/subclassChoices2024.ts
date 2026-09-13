import { FeatureDisplayType, PrismaClient } from "@prisma/client";
import source from "../../data/2024/normalized/subclass-choices.json";
import subclasses from "../../data/2024/source/subclasses-extracted.json";
import { linkChoiceOptionFeature, linkSubclassChoiceOption, upsertChoiceOption2024 } from "./helpers/choiceOptions2024";

type SourceOption = (typeof source.groups)[number]["options"][number] & { description?: string };

export async function seedSubclassChoices2024(prisma: PrismaClient) {
  const maneuverDescriptions = readManeuverDescriptions();
  let optionCount = 0;

  for (const group of source.groups) {
    const subclass = await prisma.subclass.findFirstOrThrow({
      where: { name: group.subclassName as never, ruleset: "RULES_2024" },
      select: { subclassId: true },
    });
    const levelsGranted = Object.keys(group.picksAtLevel).map(Number);

    for (const option of group.options as SourceOption[]) {
      const key = `${option.engName} (2024)`;
      const description = option.description ?? maneuverDescriptions.get(option.engName) ?? option.name;
      const feature = await prisma.feature.upsert({
        where: { engName: `Subclass Choice Feature: ${key}` },
        update: featurePayload(option.name, description),
        create: { engName: `Subclass Choice Feature: ${key}`, ...featurePayload(option.name, description) },
      });
      const choice = await upsertChoiceOption2024(prisma, {
        groupName: group.groupName,
        optionName: option.name,
        optionNameEng: key,
      });
      await linkChoiceOptionFeature(prisma, choice.choiceOptionId, feature.featureId);
      await linkSubclassChoiceOption(prisma, { subclassId: subclass.subclassId, choiceOptionId: choice.choiceOptionId, levelsGranted });
      optionCount += 1;
    }
  }

  console.log(`Вибори підкласів 2024: ${source.groups.length} груп, ${optionCount} опцій`);
}

function featurePayload(name: string, description: string) {
  return {
    name,
    description,
    shortDescription: description,
    displayType: [FeatureDisplayType.PASSIVE],
    ruleset: "RULES_2024" as const,
  };
}

function readManeuverDescriptions(): Map<string, string> {
  const battleMaster = subclasses.find((subclass) => subclass.engName === "Battle Master");
  const text = battleMaster?.featuresEng.find((feature) => feature.name === "Ultimate Combat Superiority")?.descriptionEng ?? "";
  const maneuverText = text.split("**Maneuver Options**")[1] ?? "";
  const headings = [...maneuverText.matchAll(/\*\*([^*]+)\.\*\*/g)];

  return new Map(headings.map((heading, index) => {
    const name = heading[1];
    const start = (heading.index ?? 0) + heading[0].length;
    const end = headings[index + 1]?.index ?? maneuverText.length;
    return [name, maneuverText.slice(start, end).trim()];
  }));
}
