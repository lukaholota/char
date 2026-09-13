/**
 * KR31.5 — «завжди підготовлені» заклинання підкласів 2024 мусять бути **в базі**, а не лише у
 * файлі.
 *
 * Файл із джерелом звіряє `tests/content/subclass-prepared-spells-2024.test.ts`; тут перевіряється
 * інша ланка — що сід доніс ті самі пари «заклинання + рівень класу» до `subclass_spell`. Без цієї
 * перевірки зелений контентний гейт означав би тільки «файл гарний», а клірик лишався б без
 * домених заклинань.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { SUBCLASSES_JSON } from "../../scripts/2024/parse-subclass-feature-uses";
import { toSubclassEnum } from "../../prisma/seed/subclassSeed2024";

/// Назва звіряється в нижньому регістрі: у базі стоїть «Protection From Energy», у книзі —
/// «Protection from Energy», і це розходження друкарні каталогу, а не цього переліку.
type PreparedSpellsAtLevel = { classLevel: number; spellsEng: string[] };
type SubclassJson = { engName: string; featuresEng?: Array<{ preparedSpells?: PreparedSpellsAtLevel[] }> };

const subclasses: SubclassJson[] = JSON.parse(readFileSync(join(process.cwd(), SUBCLASSES_JSON), "utf-8"));

function listExpectedRows(): string[] {
  return subclasses
    .flatMap((subclass) =>
      (subclass.featuresEng ?? []).flatMap((feature) =>
        (feature.preparedSpells ?? []).flatMap((level) =>
          level.spellsEng.map((spellEng) => `${toSubclassEnum(subclass.engName)}|${spellEng.toLowerCase()}|${level.classLevel}`),
        ),
      ),
    )
    .sort();
}

async function listSeededRows(): Promise<string[]> {
  const rows = await prisma.subclassSpell.findMany({
    where: { ruleset: "RULES_2024" },
    select: { classLevel: true, spell: { select: { engName: true } }, subclass: { select: { name: true } } },
  });

  return rows.map((row) => `${row.subclass.name}|${row.spell.engName.toLowerCase()}|${row.classLevel}`).sort();
}

describe("KR31.5 — підкласові заклинання 2024 у базі", () => {
  afterAll(disconnectDatabase);

  it("кожна пара «заклинання + рівень» із файлу стоїть у subclass_spell", async () => {
    expect(await listSeededRows()).toEqual(listExpectedRows());
  });

  it("Домен життя дає Aid на 3-му рівні клірика, а Revivify — на 5-му", async () => {
    const rows = await prisma.subclassSpell.findMany({
      where: { ruleset: "RULES_2024", subclass: { name: "LIFE_DOMAIN" } },
      select: { classLevel: true, spell: { select: { engName: true } } },
      orderBy: [{ classLevel: "asc" }],
    });

    expect(rows.filter((row) => row.spell.engName === "Aid").map((row) => row.classLevel)).toEqual([3]);
    expect(rows.filter((row) => row.spell.engName === "Revivify").map((row) => row.classLevel)).toEqual([5]);
  });
});
