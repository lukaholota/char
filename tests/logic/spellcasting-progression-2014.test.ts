import { describe, expect, it } from "vitest";

import type { PersWithRelations } from "@/lib/actions/pers";
import { getSpellcastingCountsLines } from "@/lib/logic/spellcasting-progression";
import { SPELL_KNOWLEDGE_2014, THIRD_CASTER_KNOWLEDGE_2014 } from "@/rules/spell-knowledge-2014";

const LEVELS = Array.from({ length: 20 }, (_, index) => index + 1);

function buildPers(className: string, level: number, subclassName: string | null = null): PersWithRelations {
  return {
    level,
    str: 10, dex: 10, con: 10, int: 16, wis: 16, cha: 16,
    class: { name: className, primaryCastingStat: null },
    subclass: subclassName ? { name: subclassName, primaryCastingStat: "INT" } : null,
    multiclasses: [],
  } as unknown as PersWithRelations;
}

describe("лічильники листа 2014 беруть числа з таблиць PHB (spell-knowledge-2014)", () => {
  it.each(Object.keys(SPELL_KNOWLEDGE_2014))("%s: замовляння й відомі заклинання на кожному рівні", (className) => {
    const table = SPELL_KNOWLEDGE_2014[className];
    const lines = LEVELS.map((level) => getSpellcastingCountsLines(buildPers(className, level))[0]);

    expect(lines.map((line) => line.cantrips)).toEqual([...table.cantrips]);
    if (table.known) expect(lines.map((line) => line.spells.value)).toEqual([...table.known]);
  });

  it("Лицар-Чаклун — третинна таблиця", () => {
    const lines = LEVELS.filter((level) => level >= 3).map((level) => getSpellcastingCountsLines(buildPers("FIGHTER_2014", level, "ELDRITCH_KNIGHT"))[0]);

    expect(lines.map((line) => line.cantrips)).toEqual(THIRD_CASTER_KNOWLEDGE_2014.cantrips.slice(2));
    expect(lines.map((line) => line.spells.value)).toEqual(THIRD_CASTER_KNOWLEDGE_2014.known!.slice(2));
  });
});
