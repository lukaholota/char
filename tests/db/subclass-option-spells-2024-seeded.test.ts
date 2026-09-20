/**
 * KR37.3 — заклинання земель Кола землі 2024 мусять бути **в базі**, на фічі опції, а не лише у
 * файлі. Файл із SRD звіряє `tests/content/subclass-option-spells-2024.test.ts`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";

type OptionJson = { engName: string; preparedSpells?: Array<{ classLevel: number; spellsEng: string[] }> };
const groups: Array<{ options: OptionJson[] }> = JSON.parse(
  readFileSync(join(process.cwd(), "data/2024/normalized/subclass-choices.json"), "utf-8"),
).groups;

function listExpected(): string[] {
  return groups
    .flatMap((group) => group.options)
    .filter((option) => option.preparedSpells?.length)
    .flatMap((option) => option.preparedSpells!.flatMap((row) => row.spellsEng.map((spell) => `${option.engName} (2024)|${spell.toLowerCase()}`)))
    .sort();
}

async function listSeeded(): Promise<string[]> {
  const links = await prisma.subclassChoiceOption.findMany({
    where: { ruleset: "RULES_2024", choiceOption: { features: { some: { feature: { givesSpells: { some: {} } } } } } },
    select: {
      choiceOption: {
        select: { optionNameEng: true, features: { select: { feature: { select: { givesSpells: { select: { engName: true } } } } } } },
      },
    },
  });
  return links
    .flatMap((link) => link.choiceOption.features.flatMap((entry) => entry.feature.givesSpells.map((spell) => `${link.choiceOption.optionNameEng}|${spell.engName.toLowerCase()}`)))
    .sort();
}

describe("KR37.3 — заклинання опцій підкласу 2024 у базі", () => {
  afterAll(disconnectDatabase);

  it("кожна пара «опція + заклинання» з файлу стоїть на фічі опції, і жодної зайвої", async () => {
    expect(await listSeeded()).toEqual(listExpected());
  });
});
