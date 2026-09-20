/**
 * BUG-004/005 — звірка «файл → база» для опцій вибору рис 2014. Список у
 * `prisma/seed/featChoiceOptions2014.ts` — джерело: одна група на рису, ефект у колонках.
 * Серверне правило `src/rules/feat-grants.ts` назв не читає, тож опція без ефекту тут означає
 * риску, яка мовчки не дає свого +1.
 */

import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { buildFeatChoiceOptions2014, findFeatChoiceOptionDrift } from "../../prisma/seed/featChoiceOptions2014";

afterAll(disconnectDatabase);

describe("BUG-004/005 — опції вибору рис 2014", () => {
  it("кожна опція із сіду є в базі, привʼязана до своєї риси й несе свій ефект", async () => {
    const drift = await findFeatChoiceOptionDrift(prisma);

    expect(drift.missing.map((option) => option.optionNameEng)).toEqual([]);
    expect(drift.unlinked.map((option) => option.optionNameEng)).toEqual([]);
    expect(drift.staleTexts).toEqual([]);
    expect(drift.staleEffects.map(({ option }) => option.optionNameEng)).toEqual([]);
  });

  it("риси із сіду не несуть другої, дубльованої групи", async () => {
    const seedOptions = buildFeatChoiceOptions2014();
    const seedNames = new Set(seedOptions.map((option) => option.optionNameEng));
    const links = await prisma.featChoiceOption.findMany({
      where: { feat: { ruleset: "RULES_2014", name: { in: [...new Set(seedOptions.map((option) => option.feat))] } } },
      select: { feat: { select: { name: true } }, choiceOption: { select: { optionNameEng: true, groupName: true } } },
    });

    const extras = links
      .filter((link) => !seedNames.has(link.choiceOption.optionNameEng))
      .map((link) => `${link.feat.name}: «${link.choiceOption.groupName}» ${link.choiceOption.optionNameEng}`);

    expect(extras).toEqual([]);
  });
});
