/**
 * KR31.12 — звірка «файл → база» для трьох записів 2014, які стояли без жодної риси: базова
 * людина, Своя раса і варіант людини. Список у `prisma/seed/raceTraits2014.ts` — джерело; тут
 * перевіряється, що сід прогнали і що порядок рис на картці збігся з книжковим.
 */

import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import {
  RACE_CHOICE_OPTION_TEXTS_2014,
  RACE_TRAITS_2014,
  RACE_VARIANT_TRAITS_2014,
} from "../../prisma/seed/raceTraits2014";

afterAll(disconnectDatabase);

describe("KR31.12 — риси рас 2014", () => {
  it.each(RACE_TRAITS_2014)("$raceName несе свої риси в порядку книги", async (entry) => {
    const traits = await prisma.raceTrait.findMany({
      where: { race: { name: entry.raceName, ruleset: "RULES_2014" } },
      orderBy: { raceTraitId: "asc" },
      select: { feature: { select: { engName: true } } },
    });

    expect(traits.map((trait) => trait.feature.engName)).toEqual(entry.featureEngNames);
  });

  it.each(RACE_VARIANT_TRAITS_2014)("$variantName несе свої риси", async (entry) => {
    const traits = await prisma.raceVariantTrait.findMany({
      where: { raceVariant: { name: entry.variantName, ruleset: "RULES_2014" } },
      orderBy: { raceVariantTraitId: "asc" },
      select: { feature: { select: { engName: true } } },
    });

    expect(traits.map((trait) => trait.feature.engName)).toEqual(entry.featureEngNames);
  });

  it("жодна раса 2014 не лишається без рис", async () => {
    const empty = await prisma.race.findMany({
      where: { ruleset: "RULES_2014", traits: { none: {} } },
      select: { name: true },
    });

    expect(empty.map((race) => race.name)).toEqual([]);
  });

  it.each(RACE_CHOICE_OPTION_TEXTS_2014)(
    "опція «$optionName» несе ратифікований термін, а не «$legacyOptionName»",
    async (text) => {
      const option = await prisma.raceChoiceOption.findFirst({
        where: {
          race: { name: text.raceName, ruleset: "RULES_2014" },
          choiceGroupName: text.choiceGroupName,
          optionName: { in: [text.legacyOptionName, text.optionName] },
        },
        select: { optionName: true, description: true },
      });

      expect(option).not.toBeNull();
      expect(option?.optionName).toBe(text.optionName);
      expect(option?.description).toBe(text.description);
    },
  );
});
