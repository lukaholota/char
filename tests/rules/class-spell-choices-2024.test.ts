import { describe, expect, it } from "vitest";

import {
  buildClassSpellFilters,
  canSkipPreparedSpells,
  countOwnedClassSpells,
  findClassSpellQuota,
  findCreationSpellQuota,
  findClassSpellSelectionProblem,
  tallyWizardSpellbook,
  type ClassSpellSelection,
} from "@/rules/class-spell-choices-2024";

const wizardList = ["Чарівник"];
const clericList = ["Клірик"];

const light = { spellId: 1, level: 0, school: "EVOCATION", spellLists: [...wizardList, ...clericList] };
const mageHand = { spellId: 2, level: 0, school: "CONJURATION", spellLists: wizardList };
const prestidigitation = { spellId: 3, level: 0, school: "TRANSMUTATION", spellLists: wizardList };
const guidance = { spellId: 4, level: 0, school: "DIVINATION", spellLists: clericList };
const wizardSpells = [11, 12, 13, 14, 15, 16, 17].map((spellId) => ({ spellId, level: 1, school: "EVOCATION", spellLists: wizardList }));
const mistyStep = { spellId: 21, level: 2, school: "CONJURATION", spellLists: wizardList };
const candidates = [light, mageHand, prestidigitation, guidance, ...wizardSpells, mistyStep];

describe("KR31.5 — заклинання 1-го рівня в конструкторі 2024 (P6-class-sweep-level1-07)", () => {
  it("числа 1-го рівня за таблицями класів, книга — лише в чарівника", () => {
    expect(findCreationSpellQuota("CLERIC_2024", [])).toEqual({ cantrips: 3, prepared: 4, spellbook: 0, maxSpellLevel: 1 });
    expect(findCreationSpellQuota("BARD_2024", [])).toEqual({ cantrips: 2, prepared: 4, spellbook: 0, maxSpellLevel: 1 });
    expect(findCreationSpellQuota("SORCERER_2024", [])).toEqual({ cantrips: 4, prepared: 2, spellbook: 0, maxSpellLevel: 1 });
    expect(findCreationSpellQuota("WARLOCK_2024", [])).toEqual({ cantrips: 2, prepared: 2, spellbook: 0, maxSpellLevel: 1 });
    expect(findCreationSpellQuota("WIZARD_2024", [])).toEqual({ cantrips: 3, prepared: 4, spellbook: 6, maxSpellLevel: 1 });
    expect(findCreationSpellQuota("PALADIN_2024", [])).toEqual({ cantrips: 0, prepared: 2, spellbook: 0, maxSpellLevel: 1 });
    expect(findCreationSpellQuota("RANGER_2024", [])).toEqual({ cantrips: 0, prepared: 2, spellbook: 0, maxSpellLevel: 1 });
  });

  it("не заклинач і клас 2014 кроку не мають", () => {
    expect(findCreationSpellQuota("FIGHTER_2024", [])).toBeNull();
    expect(findCreationSpellQuota("WIZARD_2014", [])).toBeNull();
  });

  it("Тауматург і Маг дають ще одне замовляння, Захисник і Охоронець — ні", () => {
    expect(findCreationSpellQuota("CLERIC_2024", ["Divine Order: Thaumaturge (2024)"])?.cantrips).toBe(4);
    expect(findCreationSpellQuota("CLERIC_2024", ["Divine Order: Protector (2024)"])?.cantrips).toBe(3);
    expect(findCreationSpellQuota("DRUID_2024", ["Primal Order: Magician (2024)"])?.cantrips).toBe(3);
    expect(findCreationSpellQuota("DRUID_2024", ["Primal Order: Warden (2024)"])?.cantrips).toBe(2);
  });

  describe("перевірка вибору чарівника", () => {
    const quota = findCreationSpellQuota("WIZARD_2024", [])!;
    const filters = buildClassSpellFilters({ className: "WIZARD_2024", classLevel: 1, subclassName: null, quota });
    const book = wizardSpells.slice(0, 6).map((spell) => spell.spellId);
    const valid: ClassSpellSelection = { cantripIds: [1, 2, 3], spellbookIds: book, preparedIds: book.slice(0, 4) };
    const check = (selection: ClassSpellSelection, unavailableSpellIds: number[] = []) =>
      findClassSpellSelectionProblem({ quota, filters, selection, candidates, usesSpellbook: true, bookSpellIds: [], unavailableSpellIds });

    it("повний вибір зі списку класу приймається", () => {
      expect(check(valid)).toBeNull();
    });

    it("не та кількість у будь-якій групі — відмова", () => {
      expect(check({ ...valid, cantripIds: [1, 2] })).toBe("Оберіть замовлянь: 3");
      expect(check({ ...valid, cantripIds: [1, 1, 2] })).toBe("Оберіть замовлянь: 3");
      expect(check({ ...valid, spellbookIds: book.slice(0, 5) })).toBe("Оберіть заклинань до книги: 6");
      expect(check({ ...valid, preparedIds: book.slice(0, 3) })).toBe("Оберіть підготовлених заклинань: 4");
    });

    it("замовляння чужого класу й заклинання зависокого рівня — відмова", () => {
      expect(check({ ...valid, cantripIds: [1, 2, 4] })).toBe("Обране замовляння не з вашого списку класу");
      expect(check({ ...valid, spellbookIds: [...book.slice(0, 5), mistyStep.spellId] })).toBe(
        "Обране заклинання не з вашого списку класу або зависокого рівня",
      );
    });

    it("підготовлене поза книгою — відмова", () => {
      expect(check({ ...valid, preparedIds: [...book.slice(0, 3), 17] })).toBe("Підготувати можна лише заклинання з книги");
    });

    it("заклинання, яке вже дає інше джерело, не займає місце вибору", () => {
      expect(check(valid, [3])).toBe("Це заклинання вже дає інше джерело — оберіть інше");
    });
  });

  it("клірик не має книги, і підготовлені не мусять у ній бути", () => {
    const quota = findCreationSpellQuota("CLERIC_2024", [])!;
    const clericSpells = [31, 32, 33, 34].map((spellId) => ({ spellId, level: 1, school: "EVOCATION", spellLists: clericList }));
    const problem = findClassSpellSelectionProblem({
      quota,
      filters: buildClassSpellFilters({ className: "CLERIC_2024", classLevel: 1, subclassName: null, quota }),
      usesSpellbook: false,
      bookSpellIds: [],
      selection: { cantripIds: [1, 4, 5], spellbookIds: [], preparedIds: [31, 32, 33, 34] },
      candidates: [light, guidance, { spellId: 5, level: 0, school: "EVOCATION", spellLists: clericList }, ...clericSpells],
      unavailableSpellIds: [],
    });

    expect(problem).toBeNull();
  });
});

describe("KR31.5 — заклинання на підвищенні рівня класу 2024 (L08-levelup-machine-11)", () => {
  const quotaAt = (className: string, classLevel: number, current: { cantrips: number; prepared: number; spellbook: number }, subclassName: string | null = null) =>
    findClassSpellQuota({ className, classLevel, subclassName, chosenClassOptionNames: [], current });

  it("клірик 3 → 4: одне нове замовляння й одне підготовлене", () => {
    expect(quotaAt("CLERIC_2024", 4, { cantrips: 3, prepared: 6, spellbook: 6 })).toEqual({ cantrips: 1, prepared: 1, spellbook: 0, maxSpellLevel: 2 });
  });

  it("чарівник 1 → 2: два заклинання до книги й одне підготовлене", () => {
    expect(quotaAt("WIZARD_2024", 2, { cantrips: 3, prepared: 4, spellbook: 6 })).toEqual({ cantrips: 0, prepared: 1, spellbook: 2, maxSpellLevel: 1 });
  });

  it("персонаж без заклинань доганяє норму нового рівня, а не лише приріст", () => {
    expect(quotaAt("WIZARD_2024", 5, { cantrips: 0, prepared: 0, spellbook: 0 })).toEqual({ cantrips: 4, prepared: 9, spellbook: 14, maxSpellLevel: 3 });
  });

  it("зайве, додане руками на листі, не робить квоту відʼємною", () => {
    expect(quotaAt("PALADIN_2024", 2, { cantrips: 0, prepared: 7, spellbook: 7 })).toEqual({ cantrips: 0, prepared: 0, spellbook: 0, maxSpellLevel: 1 });
  });

  it("Лицар-Чаклун на 3-му рівні воїна обирає зі списку чарівника, воїн без нього — нічого", () => {
    const quota = quotaAt("FIGHTER_2024", 3, { cantrips: 0, prepared: 0, spellbook: 0 }, "ELDRITCH_KNIGHT")!;
    expect(quota).toEqual({ cantrips: 2, prepared: 3, spellbook: 0, maxSpellLevel: 1 });
    expect(buildClassSpellFilters({ className: "FIGHTER_2024", classLevel: 3, subclassName: "ELDRITCH_KNIGHT", quota }).spells.spellList).toBe("Чарівник");
    expect(quotaAt("FIGHTER_2024", 3, { cantrips: 0, prepared: 0, spellbook: 0 }, "CHAMPION")).toBeNull();
  });

  it("уже наявне рахується за бейджем класу, а дароване правилом — ні", () => {
    const owned = [
      { level: 0, isPrepared: true, badgeText: "Чарівник", excludeFromPreparedCount: false },
      { level: 1, isPrepared: true, badgeText: "Чарівник", excludeFromPreparedCount: false },
      { level: 1, isPrepared: false, badgeText: "Чарівник", excludeFromPreparedCount: false },
      { level: 0, isPrepared: true, badgeText: "Високий ельф", excludeFromPreparedCount: true },
      { level: 1, isPrepared: true, badgeText: "Клірик", excludeFromPreparedCount: false },
    ];
    expect(countOwnedClassSpells(owned, "Чарівник")).toEqual({ cantrips: 1, prepared: 1, spellbook: 2 });
  });

  it("чарівник готує й те, що вже лежить у книзі", () => {
    const quota = { cantrips: 0, prepared: 1, spellbook: 2, maxSpellLevel: 1 };
    const check = (preparedIds: number[]) =>
      findClassSpellSelectionProblem({
        quota,
        filters: buildClassSpellFilters({ className: "WIZARD_2024", classLevel: 1, subclassName: null, quota }),
        selection: { cantripIds: [], spellbookIds: [11, 12], preparedIds },
        candidates,
        usesSpellbook: true,
        bookSpellIds: [16],
        unavailableSpellIds: [],
      });

    expect(check([16])).toBeNull();
    expect(check([11])).toBeNull();
    expect(check([17])).toBe("Підготувати можна лише заклинання з книги");
  });

  it("Р38: заклинання, завжди підготоване іншим джерелом, іде в книгу, але не в підготовлені", () => {
    const quota = { cantrips: 0, prepared: 1, spellbook: 2, maxSpellLevel: 1 };
    const check = (preparedIds: number[]) =>
      findClassSpellSelectionProblem({
        quota,
        filters: buildClassSpellFilters({ className: "WIZARD_2024", classLevel: 1, subclassName: null, quota }),
        selection: { cantripIds: [], spellbookIds: [11, 12], preparedIds },
        candidates,
        usesSpellbook: true,
        bookSpellIds: [],
        bookOnlySpellIds: [11],
        unavailableSpellIds: [],
      });

    expect(check([12])).toBeNull();
    expect(check([11])).toBe("Це заклинання вже завжди підготоване іншим джерелом — у книзі воно є, підготуйте інше");
  });

  it("Р38: у книзі рахується й рядок іншого джерела з бейджем чарівника, у підготовлених — ні", () => {
    const owned = [
      { level: 1, isPrepared: true, badgeText: "Чарівник", excludeFromPreparedCount: false },
      { level: 1, isPrepared: true, badgeText: "Чарівник", excludeFromPreparedCount: true },
    ];
    expect(countOwnedClassSpells(owned, "Чарівник")).toEqual({ cantrips: 0, prepared: 1, spellbook: 2 });
  });

  it("клірик, друїд і чарівник на підвищенні можуть доготувати підготовлені пізніше; решта й конструктор — ні", () => {
    expect(["CLERIC_2024", "DRUID_2024", "WIZARD_2024"].map((className) => canSkipPreparedSpells(className, true))).toEqual([true, true, true]);
    expect(["BARD_2024", "SORCERER_2024", "WARLOCK_2024", "PALADIN_2024", "RANGER_2024"].map((className) => canSkipPreparedSpells(className, true))).toEqual([
      false, false, false, false, false,
    ]);
    expect(canSkipPreparedSpells("CLERIC_2024", false)).toBe(false);
  });

  it("дозвіл пропустити підготовлені приймає менше за квоту, але не більше й не двічі одне", () => {
    const quota = { cantrips: 1, prepared: 2, spellbook: 0, maxSpellLevel: 1 };
    const check = (preparedIds: number[], canSkipPrepared: boolean) =>
      findClassSpellSelectionProblem({
        quota,
        filters: buildClassSpellFilters({ className: "CLERIC_2024", classLevel: 3, subclassName: null, quota }),
        selection: { cantripIds: [guidance.spellId], spellbookIds: [], preparedIds },
        candidates: [...candidates, ...[51, 52, 53].map((spellId) => ({ spellId, level: 1, school: "ABJURATION", spellLists: clericList }))],
        usesSpellbook: false,
        bookSpellIds: [],
        unavailableSpellIds: [],
        canSkipPrepared,
      });

    expect(check([], true)).toBeNull();
    expect(check([51], true)).toBeNull();
    expect(check([51, 52, 53], true)).toBe("Оберіть підготовлених заклинань: не більше 2");
    expect(check([51, 51], true)).toBe("Одне заклинання обрано двічі");
    expect(check([51], false)).toBe("Оберіть підготовлених заклинань: 2");
  });
});

describe("KR31.5 — Магічні таємниці барда 2024 (L05-class-choices-13)", () => {
  const bardList = ["Бард"];
  const viciousMockery = { spellId: 31, level: 0, school: "ENCHANTMENT", spellLists: bardList };
  const fireBolt = { spellId: 32, level: 0, school: "EVOCATION", spellLists: wizardList };
  const healingWord = { spellId: 33, level: 1, school: "ABJURATION", spellLists: bardList };
  const fireball = { spellId: 34, level: 3, school: "EVOCATION", spellLists: wizardList };
  const guidingBolt = { spellId: 35, level: 1, school: "EVOCATION", spellLists: clericList };
  const huntersMark = { spellId: 36, level: 1, school: "DIVINATION", spellLists: ["Слідопит"] };
  const bardCandidates = [viciousMockery, fireBolt, healingWord, fireball, guidingBolt, huntersMark];
  const quota = { cantrips: 1, prepared: 2, spellbook: 0, maxSpellLevel: 5 };

  const check = (classLevel: number, selection: ClassSpellSelection) =>
    findClassSpellSelectionProblem({
      quota,
      filters: buildClassSpellFilters({ className: "BARD_2024", classLevel, subclassName: null, quota }),
      selection,
      candidates: bardCandidates,
      usesSpellbook: false,
      bookSpellIds: [],
      unavailableSpellIds: [],
    });

  it("з 10-го рівня підготовлені — зі списків барда, клірика, друїда й чарівника; замовляння — лише бардівські", () => {
    const filters = buildClassSpellFilters({ className: "BARD_2024", classLevel: 10, subclassName: null, quota });

    expect(filters.spells.spellList).toEqual(["Бард", "Клірик", "Друїд", "Чарівник"]);
    expect(filters.cantrips.spellList).toBe("Бард");
    expect(check(10, { cantripIds: [viciousMockery.spellId], preparedIds: [fireball.spellId, guidingBolt.spellId], spellbookIds: [] })).toBeNull();
  });

  it("до 10-го рівня, чужий для таємниць список і чужі замовляння не проходять", () => {
    expect(check(9, { cantripIds: [viciousMockery.spellId], preparedIds: [healingWord.spellId, fireball.spellId], spellbookIds: [] })).toBe(
      "Обране заклинання не з вашого списку класу або зависокого рівня",
    );
    expect(check(10, { cantripIds: [viciousMockery.spellId], preparedIds: [healingWord.spellId, huntersMark.spellId], spellbookIds: [] })).toBe(
      "Обране заклинання не з вашого списку класу або зависокого рівня",
    );
    expect(check(10, { cantripIds: [fireBolt.spellId], preparedIds: [healingWord.spellId, fireball.spellId], spellbookIds: [] })).toBe(
      "Обране замовляння не з вашого списку класу",
    );
  });
});

describe("KR31.5 — лічильник книги чарівника 2024 (L07-spellcasting-10)", () => {
  const row = (level: number, badgeText: string | null, excludeFromPreparedCount = false) => ({ level, isPrepared: false, badgeText, excludeFromPreparedCount });

  it("5-й рівень: книга на 14, записано — заклинання чарівника 1+ рівня без виключених", () => {
    const owned = [row(1, "Чарівник"), row(2, "Чарівник"), row(3, "Чарівник"), row(0, "Чарівник"), row(1, "Високий ельф", true), row(1, null)];

    expect(tallyWizardSpellbook(5, owned)).toEqual({ inBook: 3, size: 14 });
    expect(tallyWizardSpellbook(1, []).size).toBe(6);
  });
});
