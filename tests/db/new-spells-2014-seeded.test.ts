import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  readNewSpells2014Deferred,
  readNewSpells2014Ready,
} from "../../prisma/seed/newSpells2014";
import { disconnectDatabase } from "../user-data";

const ready = readNewSpells2014Ready();
const deferred = readNewSpells2014Deferred();

type SeededSpell = Awaited<ReturnType<typeof readSeededSpells>>[number];

let seeded: SeededSpell[] = [];

beforeAll(async () => {
  seeded = await readSeededSpells();
});

afterAll(disconnectDatabase);

async function readSeededSpells() {
  return prisma.spell.findMany({
    where: { ruleset: "RULES_2014", engName: { in: ready.map((spell) => spell.engName) } },
    orderBy: { engName: "asc" },
    include: { spellClasses: { orderBy: { className: "asc" } } },
  });
}

describe("KR17.3 — нові заклинання 2014 у spells_test", () => {
  it("містить кожен ready-запис із його класами", () => {
    const byName = new Map(seeded.map((spell) => [spell.engName, spell]));
    const mismatches: string[] = [];

    for (const expected of ready) {
      const actual = byName.get(expected.engName);
      if (!actual) {
        mismatches.push(`${expected.engName}: відсутній`);
        continue;
      }
      for (const field of readDifferentFields(actual, expected)) {
        mismatches.push(`${expected.engName}: ${field}`);
      }
    }

    expect(mismatches).toEqual([]);
    expect(seeded).toHaveLength(ready.length);
  });

  it("не створює рядків для відкладених термінів", async () => {
    expect(
      await prisma.spell.count({
        where: { ruleset: "RULES_2014", engName: { in: deferred.map((spell) => spell.engName) } },
      }),
    ).toBe(0);
  });
});

/// Текст і механіку цих заклинань з KR34.5 звіряє `spell-source-2014-seeded` проти
/// `data/2014/spells.json`; партія імпорту лишилася джерелом лише для списку класів.
function readDifferentFields(actual: SeededSpell, expected: (typeof ready)[number]): string[] {
  const actualClasses = actual.spellClasses.map((row) => row.className).sort();
  return actualClasses.join("|") === [...expected.classes].sort().join("|") ? [] : ["classes"];
}
