import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import classTools from "../../data/2024/normalized/class-tools.json";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

describe("KR31.2 — класові інструменти 2024 у базі", () => {
  it.each(classTools.classes)("$className має точні фіксовані володіння", async (source) => {
    const characterClass = await prisma.class.findUniqueOrThrow({
      where: { name_ruleset: { name: source.className as never, ruleset: "RULES_2024" } },
      select: { toolProficiencies: true, toolToChooseCount: true, armorProficiencies: true },
    });
    expect(characterClass.toolProficiencies).toEqual(source.fixed);
    expect(characterClass.toolToChooseCount ?? 0).toBe(source.choiceCount);
    if (source.className === "DRUID_2024") {
      expect(characterClass.armorProficiencies).toEqual(["LIGHT", "SHIELD"]);
    }
  });

  it.each(classTools.classes.filter((source) => source.choiceCount > 0))(
    "$className має точний пул опцій першого рівня",
    async (source) => {
      const characterClass = await prisma.class.findUniqueOrThrow({
        where: { name_ruleset: { name: source.className as never, ruleset: "RULES_2024" } },
        select: {
          classChoiceOptions: {
            where: { choiceOption: { groupName: "Класові інструменти" } },
            include: { choiceOption: { include: { features: { include: { feature: true } } } } },
          },
        },
      });

      expect(characterClass.classChoiceOptions).toHaveLength(source.choices.length);
      for (const link of characterClass.classChoiceOptions) {
        expect(link).toMatchObject({ levelsGranted: [1], ruleset: "RULES_2024" });
        expect(link.choiceOption.ruleset).toBe("RULES_2024");
        expect(link.choiceOption.features).toHaveLength(1);
        expect(link.choiceOption.features[0].feature).toMatchObject({
          ruleset: "RULES_2024",
          toolProficiencies: [expect.any(String)],
        });
      }
    },
  );
});
