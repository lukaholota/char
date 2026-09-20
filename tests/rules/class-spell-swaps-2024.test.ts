import { describe, expect, it } from "vitest";
import { buildClassSpellFilters, findClassSpellSelectionProblem } from "@/rules/class-spell-choices-2024";
import { collectSwappableSpellIds, findLevelUpSpellSwapRule } from "@/rules/class-spell-swaps-2024";

const sorcererList = ["Чародій"];
const light = { spellId: 1, level: 0, school: "EVOCATION", spellLists: sorcererList };
const fireBolt = { spellId: 2, level: 0, school: "EVOCATION", spellLists: sorcererList };
const mageHand = { spellId: 3, level: 0, school: "CONJURATION", spellLists: sorcererList };
const shield = { spellId: 11, level: 1, school: "ABJURATION", spellLists: sorcererList };
const sleep = { spellId: 12, level: 1, school: "ENCHANTMENT", spellLists: sorcererList };
const fireball = { spellId: 13, level: 3, school: "EVOCATION", spellLists: sorcererList };
const candidates = [light, fireBolt, mageHand, shield, sleep, fireball];

describe("L08-levelup-machine-11 — заміна одного заклинання на новому рівні класу 2024", () => {
  it("замовляння міняють бард, клірик, друїд, чародій і чорнокнижник; підготовлене — бард, чародій, чорнокнижник", () => {
    expect(findLevelUpSpellSwapRule("SORCERER_2024")).toEqual({ cantrip: true, prepared: true });
    expect(findLevelUpSpellSwapRule("CLERIC_2024")).toEqual({ cantrip: true, prepared: false });
    expect(findLevelUpSpellSwapRule("WIZARD_2024")).toBeNull();
    expect(findLevelUpSpellSwapRule("PALADIN_2024")).toBeNull();
    expect(findLevelUpSpellSwapRule("SORCERER_2014")).toBeNull();
  });

  it("замінити можна лише своє: заклинання класу за бейджем, підготовлене, без виключених з ліміту", () => {
    const owned = [
      { spellId: 1, level: 0, isPrepared: true, badgeText: "Чародій", excludeFromPreparedCount: false },
      { spellId: 11, level: 1, isPrepared: true, badgeText: "Чародій", excludeFromPreparedCount: false },
      { spellId: 12, level: 1, isPrepared: false, badgeText: "Чародій", excludeFromPreparedCount: false },
      { spellId: 20, level: 1, isPrepared: true, badgeText: "Доторк феї", excludeFromPreparedCount: true },
      { spellId: 21, level: 0, isPrepared: true, badgeText: "Високий ельф", excludeFromPreparedCount: true },
    ];

    expect(collectSwappableSpellIds({ cantrip: true, prepared: true }, owned, "Чародій")).toEqual({ cantripIds: [1], preparedIds: [11] });
    expect(collectSwappableSpellIds({ cantrip: true, prepared: false }, owned, "Чародій").preparedIds).toEqual([]);
  });

  it("сервер приймає заміну лише своїм на доступне, цілу й без дубля з новими заклинаннями", () => {
    const quota = { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 2 };
    const check = (selection: Parameters<typeof findClassSpellSelectionProblem>[0]["selection"]) =>
      findClassSpellSelectionProblem({
        quota,
        filters: buildClassSpellFilters({ className: "SORCERER_2024", classLevel: 3, subclassName: null, quota }),
        selection,
        candidates,
        usesSpellbook: false,
        bookSpellIds: [],
        unavailableSpellIds: [],
        droppableCantripIds: [light.spellId],
        droppableSpellIds: [shield.spellId],
      });
    const base = { cantripIds: [], preparedIds: [sleep.spellId], spellbookIds: [] };

    expect(check({ ...base, cantripSwap: { dropId: light.spellId, addId: fireBolt.spellId } })).toBeNull();
    expect(check({ ...base, cantripSwap: { dropId: light.spellId, addId: null } })).toBe("Для заміни оберіть і що прибрати, і що взяти натомість");
    expect(check({ ...base, cantripSwap: { dropId: mageHand.spellId, addId: fireBolt.spellId } })).toBe("Замінити можна лише заклинання цього класу, обране гравцем");
    expect(check({ ...base, preparedSwap: { dropId: shield.spellId, addId: fireball.spellId } })).toBe("Обране заклинання не з вашого списку класу або зависокого рівня");
    expect(check({ ...base, preparedSwap: { dropId: shield.spellId, addId: sleep.spellId } })).toBe("Одне заклинання обрано двічі");
  });
});
