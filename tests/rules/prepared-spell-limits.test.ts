import { describe, expect, it } from "vitest";
import type { PersWithRelations } from "@/lib/actions/pers";
import { getSpellcastingCountsLines } from "@/lib/logic/spellcasting-progression";
import { findPreparedRemaining, tallyPreparedSpellsByClass, type PreparedSpellRow } from "@/rules/prepared-spell-limits";

const prepared = (badgeText: string | null, count: number, overrides: Partial<PreparedSpellRow> = {}): PreparedSpellRow[] =>
  Array.from({ length: count }, () => ({ level: 1, isPrepared: true, badgeText, isExcludedFromPrepared: false, ...overrides }));

function buildRanger4Sorcerer3(): PersWithRelations {
  return {
    level: 7,
    str: 10, dex: 16, con: 12, int: 10, wis: 14, cha: 14,
    class: { name: "RANGER_2024", primaryCastingStat: "WIS" },
    subclass: null,
    multiclasses: [{ classLevel: 3, class: { name: "SORCERER_2024", primaryCastingStat: "CHA" }, subclass: null }],
  } as unknown as PersWithRelations;
}

describe("L07-spellcasting-12 — ліміт підготовлених у мультикласі окремий на клас", () => {
  // data/2024/srd/character-creation.md:937: «level 4 Ranger / level 3 Sorcerer … five level 1 Ranger spells … six Sorcerer spells».
  it("Слідопит 4 / Чародій 3: дві стелі 5 і 6, заклинання йде до класу за бейджем", () => {
    const lines = getSpellcastingCountsLines(buildRanger4Sorcerer3());
    const spells = [...prepared("Слідопит", 2), ...prepared("Чародій", 7), ...prepared("Чародій", 1, { level: 0 }), ...prepared("Чародій", 1, { isExcludedFromPrepared: true })];

    const tallies = tallyPreparedSpellsByClass(lines, spells);

    expect(tallies.byClass.map(({ name, prepared: count, limit }) => ({ name, prepared: count, limit }))).toEqual([
      { name: "Слідопит", prepared: 2, limit: 5 },
      { name: "Чародій", prepared: 7, limit: 6 },
    ]);
    expect(findPreparedRemaining(tallies, "Слідопит")).toBe(3);
    expect(findPreparedRemaining(tallies, "Чародій")).toBe(-1);
  });

  it("заклинання без бейджа класу в мультикласі не зараховується жодному класу", () => {
    const tallies = tallyPreparedSpellsByClass(getSpellcastingCountsLines(buildRanger4Sorcerer3()), [...prepared(null, 2), ...prepared("Посвячений у магію", 1)]);

    expect(tallies.byClass.map((tally) => tally.prepared)).toEqual([0, 0]);
    expect(tallies.unassigned).toBe(3);
    expect(findPreparedRemaining(tallies, null)).toBeNull();
  });

  it("один клас: усі підготовлені йдуть до нього незалежно від бейджа", () => {
    const pers = { ...buildRanger4Sorcerer3(), level: 4, multiclasses: [] } as unknown as PersWithRelations;
    const tallies = tallyPreparedSpellsByClass(getSpellcastingCountsLines(pers), [...prepared(null, 3), ...prepared("Слідопит", 1)]);

    expect(tallies.byClass).toEqual([expect.objectContaining({ prepared: 4, limit: 5 })]);
    expect(findPreparedRemaining(tallies, null)).toBe(1);
  });
});
