import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { getAllSpells } from "@/lib/spellsData";
import { isSpellChoiceCandidate, type SpellChoiceFilter } from "@/rules/spell-choice-filter";
import { loadSpellChoiceOptions } from "@/server/db/spell-choice-options";

const ALL_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const catalog = getAllSpells("RULES_2014").map((spell) => ({
  spellId: spell.spellId, engName: spell.engName, level: spell.level, school: null,
  spellLists: spell.spellClasses.map((entry) => entry.className),
}));

function listCatalogSpellLists(): string[] {
  return [...new Set(catalog.flatMap((spell) => spell.spellLists))].sort();
}

async function listServerSpellLists(): Promise<string[]> {
  const rows = await prisma.spellClasses.findMany({ where: { ruleset: "RULES_2014" }, select: { className: true }, distinct: ["className"] });
  return rows.map((row) => row.className).sort();
}

function listCatalogOffer(filter: SpellChoiceFilter): string[] {
  return catalog.filter((spell) => isSpellChoiceCandidate(filter, spell)).map((spell) => spell.engName).sort();
}

async function listServerOffer(filter: SpellChoiceFilter): Promise<string[]> {
  return (await loadSpellChoiceOptions(prisma, "RULES_2014", filter)).map((spell) => spell.engName).sort();
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("пресети 2014 пропонують із каталогу рівно те, що сервер приймає з бази", () => {
  it("каталог і база знають ті самі списки заклинань", async () => {
    expect(listCatalogSpellLists()).toEqual(await listServerSpellLists());
  });

  it("для кожного списку класу чи підкласу каталог і сервер дають ті самі заклинання", async () => {
    const mismatches: { spellList: string; onlyCatalog: string[]; onlyServer: string[] }[] = [];
    for (const spellList of listCatalogSpellLists()) {
      const filter: SpellChoiceFilter = { levels: ALL_LEVELS, schools: null, spellList };
      const fromCatalog = listCatalogOffer(filter);
      const fromServer = await listServerOffer(filter);
      const onlyCatalog = fromCatalog.filter((name) => !fromServer.includes(name));
      const onlyServer = fromServer.filter((name) => !fromCatalog.includes(name));
      if (onlyCatalog.length || onlyServer.length) mismatches.push({ spellList, onlyCatalog, onlyServer });
    }
    expect(mismatches).toEqual([]);
  });
});
