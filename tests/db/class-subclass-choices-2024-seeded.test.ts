import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import classChoices from "../../data/2024/normalized/class-choices.json";
import subclassChoices from "../../data/2024/normalized/subclass-choices.json";
import invocations from "../../data/2024/normalized/invocations.json";
import { disconnectDatabase } from "../user-data";
import { BLOOD_HUNTER_CLASS_NAMES } from "../../prisma/seed/bloodHunter";

afterAll(disconnectDatabase);

describe("KR31.2 — class/subclass choices 2024 у базі", () => {
  it("all 13 classes have the exact level-1 class-choice inventory", async () => {
    const expected: Record<string, Record<string, number>> = {
      ARTIFICER_2024: { "Класові інструменти": 16 },
      BARBARIAN_2024: {},
      BARD_2024: { "Класові інструменти": 10 },
      CLERIC_2024: { "Божественний орден": 2 },
      DRUID_2024: { "Первісний орден": 2 },
      FIGHTER_2024: { "Бойовий стиль": 10 },
      MONK_2024: { "Класові інструменти": 27 },
      PALADIN_2024: {},
      RANGER_2024: {},
      ROGUE_2024: {},
      SORCERER_2024: {},
      WARLOCK_2024: { "Потойбічні виклики": 32 },
      WIZARD_2024: {},
    };
    const classes = await prisma.class.findMany({
      // Мисливець за кровʼю — власний носій O45, його звіряє blood-hunter-carrier.
      where: { ruleset: "RULES_2024", name: { notIn: [...BLOOD_HUNTER_CLASS_NAMES] } },
      select: {
        name: true,
        classChoiceOptions: {
          where: { levelsGranted: { has: 1 } },
          select: { choiceOption: { select: { groupName: true } } },
        },
      },
    });
    const actual = Object.fromEntries(classes.map((characterClass) => {
      const counts: Record<string, number> = {};
      for (const link of characterClass.classChoiceOptions) {
        counts[link.choiceOption.groupName] = (counts[link.choiceOption.groupName] ?? 0) + 1;
      }
      return [characterClass.name, counts];
    }));
    expect(actual).toEqual(expected);
  });

  it.each(classChoices.groups)("$className: $groupName", async (source) => {
    const characterClass = await prisma.class.findUniqueOrThrow({
      where: { name_ruleset: { name: source.className as never, ruleset: "RULES_2024" } },
      select: {
        classChoiceOptions: {
          where: { choiceOption: { groupName: source.groupName } },
          include: { choiceOption: { include: { features: { include: { feature: true } } } } },
        },
      },
    });

    for (const option of source.options) {
      const link = characterClass.classChoiceOptions.find(
        (candidate) => candidate.choiceOption.optionNameEng === `${option.engName} (2024)`,
      );
      expect(link, option.engName).toMatchObject({
        levelsGranted: Object.keys(source.picksAtLevel).map(Number),
        ruleset: "RULES_2024",
        choiceOption: { optionName: option.name, ruleset: "RULES_2024" },
      });
      expect(link?.choiceOption.features.map((entry) => entry.feature)).toEqual([
        expect.objectContaining({ name: option.name, ruleset: "RULES_2024" }),
      ]);
    }
  });

  it.each(subclassChoices.groups)("$subclassName: $groupName", async (source) => {
    const subclass = await prisma.subclass.findFirstOrThrow({
      where: { name: source.subclassName as never, ruleset: "RULES_2024" },
      select: {
        subclassChoiceOptions: {
          where: { choiceOption: { groupName: source.groupName } },
          include: { choiceOption: { include: { features: { include: { feature: true } } } } },
        },
      },
    });

    expect(subclass.subclassChoiceOptions).toHaveLength(source.options.length);
    for (const option of source.options) {
      const link = subclass.subclassChoiceOptions.find(
        (candidate) => candidate.choiceOption.optionNameEng === `${option.engName} (2024)`,
      );
      expect(link, option.engName).toMatchObject({
        levelsGranted: Object.keys(source.picksAtLevel).map(Number),
        ruleset: "RULES_2024",
        choiceOption: { optionName: option.name, ruleset: "RULES_2024" },
      });
      expect(link?.choiceOption.features).toHaveLength(1);
    }
  });

  it("seeds every normalized invocation including Thirsting Blade", async () => {
    const options = await prisma.choiceOption.findMany({
      where: { ruleset: "RULES_2024", groupName: "Потойбічні виклики" },
      select: { optionNameEng: true },
    });
    expect(options.map((option) => option.optionNameEng).sort()).toEqual(
      invocations.map((invocation) => `${invocation.engName} (2024)`).sort(),
    );
  });

  it("Primal Knowledge requires one barbarian skill", async () => {
    const feature = await prisma.feature.findUniqueOrThrow({ where: { engName: "Barbarian: Primal Knowledge (2024)" } });
    expect(feature.skillProficiencies).toEqual({
      choiceCount: 1,
      options: ["ANIMAL_HANDLING", "ATHLETICS", "INTIMIDATION", "NATURE", "PERCEPTION", "SURVIVAL"],
    });
  });
});
