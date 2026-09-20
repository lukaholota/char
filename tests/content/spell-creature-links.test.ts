import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Ruleset } from "@prisma/client";
import { findCreatureByKey } from "@/lib/bestiaryData";
import { findSpellCreatureLinks } from "@/lib/logic/spell-creature-links";

type SpellSource = { engName: string; description: string };

const SOURCES: Array<{ path: string; ruleset: Ruleset }> = [
  { path: "data/2014/spells.json", ruleset: "RULES_2014" },
  { path: "data/2024/normalized/spells.json", ruleset: "RULES_2024" },
];

function readSpells(path: string): SpellSource[] {
  return JSON.parse(readFileSync(path, "utf8"));
}

describe.each(SOURCES)("посилання заклинань на бестіарій — $path", ({ path, ruleset }) => {
  const spells = readSpells(path);

  it("не лишилось старих адрес /creature/N, яких сайт не має", () => {
    expect(spells.filter((spell) => spell.description.includes("/creature/")).map((spell) => spell.engName)).toEqual([]);
  });

  it("кожне посилання веде на істоту своєї редакції, що є в каталозі", () => {
    const broken = spells.flatMap((spell) =>
      findSpellCreatureLinks(spell.description)
        .filter((link) => link.ruleset !== ruleset || !findCreatureByKey(link.key, ruleset))
        .map((link) => `${spell.engName} → ${link.ruleset} ${link.key}`)
    );
    expect(broken).toEqual([]);
  });

  it("кожне заклинання «Виклик …» веде на статблок свого духу", () => {
    const summonsWithoutLink = spells
      .filter((spell) => spell.engName.startsWith("Summon ") && spell.description.includes("статблок"))
      .filter((spell) => findSpellCreatureLinks(spell.description).length === 0)
      .map((spell) => spell.engName);
    expect(summonsWithoutLink).toEqual([]);
  });
});
