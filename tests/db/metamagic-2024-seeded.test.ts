import { afterAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import metamagic from "../../data/2024/normalized/metamagic.json";

afterAll(disconnectDatabase);

it("метамагія 2024 має десять опцій на 2/10/17 та три окремі надання", async () => {
  const sorcerer = await prisma.class.findUniqueOrThrow({
    where: { name_ruleset: { name: "SORCERER_2024", ruleset: "RULES_2024" } },
    include: {
      classChoiceOptions: { where: { choiceOption: { groupName: "Метамагія" } }, include: { choiceOption: { include: { features: { include: { feature: true } } } } } },
      features: { where: { feature: { name: "Метамагія" } }, include: { feature: true } },
    },
  });
  expect(sorcerer.classChoiceOptions).toHaveLength(metamagic.options.length);
  for (const source of metamagic.options) {
    const grant = sorcerer.classChoiceOptions.find(link => link.choiceOption.optionNameEng === `${source.engName} (2024)`);
    expect(grant, source.engName).toMatchObject({ ruleset: "RULES_2024", levelsGranted: metamagic.levelsGranted });
    expect(grant!.choiceOption).toMatchObject({ optionName: source.name, ruleset: "RULES_2024" });
    expect(grant!.choiceOption.features.map(link => link.feature)).toEqual([
      expect.objectContaining({ name: source.name, description: `Вартість в очках чародійства: ${source.cost}.\n\n${source.description}`, ruleset: "RULES_2024" }),
    ]);
  }
  expect(sorcerer.features.map(grant => grant.levelGranted).sort((a, b) => a - b)).toEqual(metamagic.levelsGranted);
  expect(sorcerer.features.find(grant => grant.levelGranted === 2)?.feature.engName).toBe("Sorcerer: Metamagic (2024)");
});
