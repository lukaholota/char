import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { findClassTableSpellSlots, type ClassTableClass } from "@/rules/class-table-spell-slots";

const SRD_CLASSES = readFileSync(join(process.cwd(), "data/2024/srd/classes.md"), "utf8");

function readBookSlots(className: string): number[][] {
  const start = SRD_CLASSES.indexOf(`**${className} Features**`);
  const table = SRD_CLASSES.slice(start, SRD_CLASSES.indexOf("</table>", start));
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((row) => [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => cell[1].replace(/<[^>]+>/g, "").trim()))
    .filter((cells) => cells.length > 0);

  return rows.map((cells) => {
    const slots = cells.slice(-5).map((cell) => (/^\d+$/.test(cell) ? Number(cell) : 0));
    return [...slots, 0, 0, 0, 0];
  });
}

const halfCaster = (name: string, ruleset: ClassTableClass["ruleset"]): ClassTableClass => ({
  name,
  ruleset,
  spellcastingType: "HALF",
  specialSpellSlotProgression: null,
});

describe("KR31.5 — таблиця слотів у картці класу напівзаклинача (L07-spellcasting-09)", () => {
  it.each(["Paladin", "Ranger"])("%s 2024: усі 20 рівнів дорівнюють таблиці книги", (className) => {
    const cls = halfCaster(`${className.toUpperCase()}_2024`, "RULES_2024");
    const book = readBookSlots(className);

    expect(book).toHaveLength(20);
    expect(book.map((_, index) => findClassTableSpellSlots(cls, index + 1))).toEqual(book);
  });

  it("Паладин 2014 на 1-му рівні слотів не має, на 3-му — три", () => {
    const cls = halfCaster("PALADIN_2014", "RULES_2014");

    expect(findClassTableSpellSlots(cls, 1)).toBeNull();
    expect(findClassTableSpellSlots(cls, 3)).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("Артифіцер 2014 на 1-му рівні має два слоти", () => {
    expect(findClassTableSpellSlots(halfCaster("ARTIFICER_2014", "RULES_2014"), 1)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});
