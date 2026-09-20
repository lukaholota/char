/**
 * KR37.3 — таблиці земель Кола землі 2024 у файлі-джерелі мусять дорівнювати SRD, а рівень,
 * який виводить правило з рівня заклинання, — рядку таблиці.
 *
 * Таблиці читаються **другим, незалежним** проходом по `data/2024/srd/classes.md`: заголовок
 * `**X Land**` і html-таблиця «Druid Level | Circle Spells» під ним. Правка переліку руками в
 * `subclass-choices.json` робить гейт червоним, і так само робить розбіжність між виведеним
 * рівнем і книгою — тоді рівень треба нести явно, а не виводити.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findSubclassOptionSpellClassLevel } from "../../src/rules/subclass-option-spells-2024";

type PreparedSpellsAtLevel = { classLevel: number; spellsEng: string[] };
type OptionJson = { engName: string; preparedSpells?: PreparedSpellsAtLevel[] };
type GroupJson = { subclassName: string; groupName: string; picksAtLevel: Record<string, number>; options: OptionJson[] };

const CHOICES_JSON = "data/2024/normalized/subclass-choices.json";
const SRD_CLASSES = "data/2024/srd/classes.md";
const LAND_OPTION_PREFIX = "Circle of the Land: ";

const groups: GroupJson[] = JSON.parse(readFileSync(join(process.cwd(), CHOICES_JSON), "utf-8")).groups;
const spellLevels: Map<string, number> = new Map(
  (JSON.parse(readFileSync(join(process.cwd(), "data/2024/normalized/spells.json"), "utf-8")) as Array<{ engName: string; level: number }>)
    .map((spell) => [spell.engName.toLowerCase(), spell.level]),
);

function readLandTablesFromSrd(): Map<string, PreparedSpellsAtLevel[]> {
  const text = readFileSync(join(process.cwd(), SRD_CLASSES), "utf-8");
  const section = text.split("#### Level 3: Circle of the Land Spells")[1].split("#### ")[0];
  const tables = new Map<string, PreparedSpellsAtLevel[]>();

  for (const block of section.split("**").slice(1)) {
    const land = block.match(/^(\w+) Land$/)?.[1];
    if (!land) continue;
    const html = section.split(`**${land} Land**`)[1].split("</table>")[0];
    const rows = [...html.matchAll(/<tr>\s*<td>(\d+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g)];
    tables.set(land, rows.map((row) => ({
      classLevel: Number(row[1]),
      spellsEng: row[2].split(",").map((name) => name.trim()),
    })));
  }
  return tables;
}

function listLandOptions(): OptionJson[] {
  return groups.flatMap((group) => group.options.filter((option) => option.engName.startsWith(LAND_OPTION_PREFIX)));
}

describe("KR37.3 — заклинання земель Кола землі 2024 дорівнюють SRD", () => {
  const fromSrd = readLandTablesFromSrd();

  it("SRD має рівно чотири землі, і кожна є опцією групи «Коло землі»", () => {
    expect([...fromSrd.keys()].sort()).toEqual(["Arid", "Polar", "Temperate", "Tropical"]);
    expect(listLandOptions().map((option) => option.engName.slice(LAND_OPTION_PREFIX.length)).sort()).toEqual([...fromSrd.keys()].sort());
  });

  it("таблиця кожної землі у файлі збігається з таблицею SRD", () => {
    for (const option of listLandOptions()) {
      const land = option.engName.slice(LAND_OPTION_PREFIX.length);
      expect({ land, spells: option.preparedSpells }).toEqual({ land, spells: fromSrd.get(land) });
    }
  });

  it("рівень, виведений із рівня заклинання, дорівнює рядку таблиці для кожного заклинання", () => {
    const group = groups.find((candidate) => candidate.subclassName === "CIRCLE_OF_THE_LAND")!;
    const pickLevel = Math.min(...Object.keys(group.picksAtLevel).map(Number));

    for (const option of listLandOptions()) {
      for (const row of option.preparedSpells!) {
        for (const spellEng of row.spellsEng) {
          const spellLevel = spellLevels.get(spellEng.toLowerCase());
          expect({ spellEng, spellLevel }).not.toEqual({ spellEng, spellLevel: undefined });
          const derived = findSubclassOptionSpellClassLevel({ className: "DRUID_2024", subclassName: "CIRCLE_OF_THE_LAND", pickLevel, spellLevel: spellLevel! });
          expect({ spellEng, classLevel: derived }).toEqual({ spellEng, classLevel: row.classLevel });
        }
      }
    }
  });

  it("жодна інша опція підкласу 2024 заклинань не несе", () => {
    const others = groups.flatMap((group) => group.options.filter((option) => option.preparedSpells?.length && !option.engName.startsWith(LAND_OPTION_PREFIX)));
    expect(others.map((option) => option.engName)).toEqual([]);
  });
});
