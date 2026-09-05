import { describe, expect, it } from "vitest";
import { getSpellcastingCountsLines } from "@/lib/logic/spellcasting-progression";
import type { PersWithRelations } from "@/lib/actions/pers";

type ClassEntry = { name: string; level: number; subclass?: string };

// Функція читає лише рівні, назви класів і підкласів; решта PersWithRelations їй не потрібна.
function buildPers(starting: ClassEntry, ...multiclasses: ClassEntry[]): PersWithRelations {
  return {
    level: starting.level + multiclasses.reduce((total, entry) => total + entry.level, 0),
    class: { name: starting.name, primaryCastingStat: null },
    subclass: starting.subclass ? { name: starting.subclass, primaryCastingStat: null } : null,
    multiclasses: multiclasses.map((entry) => ({
      classLevel: entry.level,
      class: { name: entry.name, primaryCastingStat: null },
      subclass: entry.subclass ? { name: entry.subclass, primaryCastingStat: null } : null,
    })),
  } as unknown as PersWithRelations;
}

describe("KR27.7 — рядки лічильників заклинань для класів 2024", () => {
  it("Чарівник 4 / Клірик 4: два рядки з фіксованими числами таблиці, у чарівника — примітка про книгу (№21)", () => {
    const lines = getSpellcastingCountsLines(buildPers({ name: "WIZARD_2024", level: 4 }, { name: "CLERIC_2024", level: 4 }));

    expect(lines.map((line) => ({ key: line.key, cantrips: line.cantrips, spells: line.spells, note: line.spellsNote ?? null }))).toEqual([
      { key: "class:WIZARD_2024:4", cantrips: 4, spells: { kind: "fixed", value: 7 }, note: "+ книга заклинань" },
      { key: "class:CLERIC_2024:4", cantrips: 4, spells: { kind: "fixed", value: 7 }, note: null },
    ]);
    expect(lines.every((line) => line.spellsLabel.includes("можна підготувати"))).toBe(true);
  });

  it("Воїн 3 (Лицар-Чаклун) / Чарівник 5: третинний підклас має власний рядок під назвою підкласу (№17)", () => {
    const lines = getSpellcastingCountsLines(
      buildPers({ name: "FIGHTER_2024", level: 3, subclass: "ELDRITCH_KNIGHT" }, { name: "WIZARD_2024", level: 5 }),
    );

    expect(lines.map((line) => line.key)).toEqual(["subclass:ELDRITCH_KNIGHT:3", "class:WIZARD_2024:5"]);
    expect(lines[0].spells).toEqual({ kind: "fixed", value: 3 });
  });

  it("Воїн 6 / Пройдисвіт 4 без підкласів-заклиначів: рядків немає", () => {
    expect(getSpellcastingCountsLines(buildPers({ name: "FIGHTER_2024", level: 6, subclass: "CHAMPION" }, { name: "ROGUE_2024", level: 4, subclass: "THIEF" }))).toEqual([]);
  });
});
