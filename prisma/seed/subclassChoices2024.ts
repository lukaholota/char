import { FeatureDisplayType, PrismaClient } from "@prisma/client";
import source from "../../data/2024/normalized/subclass-choices.json";
import subclasses from "../../data/2024/source/subclasses-extracted.json";
import { linkChoiceOptionFeature, linkSubclassChoiceOption, upsertChoiceOption2024 } from "./helpers/choiceOptions2024";

type PreparedSpellsAtLevel = { classLevel: number; spellsEng: string[] };
type SourceOption = (typeof source.groups)[number]["options"][number] & {
  description?: string;
  /// Коло землі: таблиця «рівень друїда → заклинання» за типом землі. У базу їде лише звʼязок
  /// «фіча → заклинання»; рівень виводить `src/rules/subclass-option-spells-2024.ts`.
  preparedSpells?: PreparedSpellsAtLevel[];
};

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
      await connectOptionSpells(prisma, feature.featureId, option);
      optionCount += 1;
    }
  }

  console.log(`Вибори підкласів 2024: ${source.groups.length} груп, ${optionCount} опцій`);
}

async function connectOptionSpells(prisma: PrismaClient, featureId: number, option: SourceOption) {
  const spellsEng = (option.preparedSpells ?? []).flatMap((row) => row.spellsEng);
  if (!spellsEng.length) return;

  const spells = await prisma.spell.findMany({
    where: { ruleset: "RULES_2024", engName: { in: spellsEng, mode: "insensitive" } },
    select: { spellId: true, engName: true },
  });
  const found = new Set(spells.map((spell) => spell.engName.toLowerCase()));
  for (const name of spellsEng) {
    if (!found.has(name.toLowerCase())) console.warn(`  ⚠️ Заклинання "${name}" (${option.engName}) немає серед 2024 — пропущено`);
  }
  await prisma.feature.update({
    where: { featureId },
    data: { givesSpells: { set: spells.map((spell) => ({ spellId: spell.spellId })) } },
  });
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
