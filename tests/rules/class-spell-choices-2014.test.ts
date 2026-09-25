import { describe, expect, it } from "vitest";

import {
  buildClassSpellFilters2014,
  canSwapKnownSpellOnLevel2014,
  countOwnedClassSpells2014,
  describeSchoolLimit2014,
  describeSpellListNote2014,
  findCreationSpellAllowance2014,
  findLevelUpSpellAllowance2014,
  findSchoolLimit2014,
  findSchoolLimitProblem,
  findSpellLists2014,
  hasCreationSpellChoice2014,
} from "@/rules/class-spell-choices-2014";
import { findClassSpellSelectionProblem } from "@/rules/class-spell-choices-2024";

const allowanceAt = (className: string, classLevel: number, owned = { cantrips: 0, prepared: 0, spellbook: 0 }, subclassName: string | null = null) =>
  findLevelUpSpellAllowance2014({ className, subclassName, classLevel, owned });

const NONE = { cantrips: 0, prepared: 0, spellbook: 0 };
const eldritchKnight = { className: "FIGHTER_2014", subclassName: "ELDRITCH_KNIGHT" };
const arcaneTrickster = { className: "ROGUE_2014", subclassName: "ARCANE_TRICKSTER" };
const wizardOwned = (level: number, school: string, badgeText: string | null = "Воїн") => ({ level, school, badgeText, excludeFromPreparedCount: false, spellLists: ["Чарівник"] });

describe("заклинання на підвищенні рівня 2014 — прибавка обовʼязкова, решта до таблиці за бажанням", () => {
  it("бард 5 → 6 із повним списком: одне нове заклинання 3-го рівня й нічого догнати", () => {
    expect(allowanceAt("BARD_2014", 6, { cantrips: 3, prepared: 8, spellbook: 8 })).toEqual({
      quota: { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 3 },
      catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
    });
  });

  it("бард 5 → 6 із двома заклинаннями на листі: одне обовʼязкове, ще шість і три замовляння — за бажанням", () => {
    expect(allowanceAt("BARD_2014", 6, { cantrips: 0, prepared: 2, spellbook: 2 })).toEqual({
      quota: { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 3 },
      catchUp: { cantrips: 3, prepared: 6, spellbook: 0 },
    });
  });

  it("персонаж, що вже має більше за таблицю, нічого не мусить обирати", () => {
    expect(allowanceAt("SORCERER_2014", 4, { cantrips: 6, prepared: 9, spellbook: 9 })).toBeNull();
  });

  it("клірик 3 → 4 обирає лише замовляння, 4 → 5 — нічого", () => {
    expect(allowanceAt("CLERIC_2014", 4, { cantrips: 3, prepared: 10, spellbook: 10 })).toEqual({
      quota: { cantrips: 1, prepared: 0, spellbook: 0, maxSpellLevel: 2 },
      catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
    });
    expect(allowanceAt("CLERIC_2014", 5, { cantrips: 4, prepared: 0, spellbook: 0 })).toBeNull();
  });

  it("паладин не обирає нічого, слідопит 1 → 2 — перші два заклинання", () => {
    expect(allowanceAt("PALADIN_2014", 5)).toBeNull();
    expect(allowanceAt("RANGER_2014", 2)).toEqual({
      quota: { cantrips: 0, prepared: 2, spellbook: 0, maxSpellLevel: 1 },
      catchUp: { cantrips: 0, prepared: 0, spellbook: 0 },
    });
  });

  it("чарівник 3 → 4: замовляння й два заклинання до книги обовʼязково, а порожню книгу можна доповнити до 12", () => {
    expect(allowanceAt("WIZARD_2014", 4, { cantrips: 0, prepared: 0, spellbook: 0 })).toEqual({
      quota: { cantrips: 1, prepared: 0, spellbook: 2, maxSpellLevel: 2 },
      catchUp: { cantrips: 3, prepared: 0, spellbook: 10 },
    });
  });

  it("мультиклас у чарівника: шість до книги на першому рівні класу", () => {
    expect(allowanceAt("WIZARD_2014", 1)?.quota).toEqual({ cantrips: 3, prepared: 0, spellbook: 6, maxSpellLevel: 1 });
  });

  it("чорнокнижник 9 → 10 нових заклинань не отримує — лише замовляння", () => {
    expect(allowanceAt("WARLOCK_2014", 10, { cantrips: 3, prepared: 10, spellbook: 10 })?.quota).toEqual({ cantrips: 1, prepared: 0, spellbook: 0, maxSpellLevel: 5 });
  });

  it("клас без чаклунства — null", () => {
    expect(allowanceAt("FIGHTER_2014", 3)).toBeNull();
    expect(allowanceAt("FIGHTER_2014", 3, NONE, "CHAMPION")).toBeNull();
    expect(allowanceAt("BARD_2024", 3)).toBeNull();
  });

  it("Потойбічний лицар на 3-му рівні воїна: два замовляння й три заклинання 1-го рівня, на 4-му — одне, на 7-му — 2-й рівень", () => {
    expect(allowanceAt("FIGHTER_2014", 3, NONE, "ELDRITCH_KNIGHT")).toEqual({
      quota: { cantrips: 2, prepared: 3, spellbook: 0, maxSpellLevel: 1 },
      catchUp: NONE,
    });
    expect(allowanceAt("FIGHTER_2014", 4, { cantrips: 2, prepared: 3, spellbook: 3 }, "ELDRITCH_KNIGHT")?.quota).toEqual({ cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 1 });
    expect(allowanceAt("ROGUE_2014", 7, { cantrips: 2, prepared: 4, spellbook: 4 }, "ARCANE_TRICKSTER")?.quota).toEqual({ cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 2 });
    expect(allowanceAt("FIGHTER_2014", 10, { cantrips: 0, prepared: 0, spellbook: 0 }, "ELDRITCH_KNIGHT")).toEqual({
      quota: { cantrips: 1, prepared: 1, spellbook: 0, maxSpellLevel: 2 },
      catchUp: { cantrips: 2, prepared: 6, spellbook: 0 },
    });
  });
});

describe("заклинання в конструкторі 2014 — уся таблиця 1-го рівня обовʼязкова", () => {
  const atCreation = (className: string, subclassName: string | null = null) => findCreationSpellAllowance2014({ className, subclassName });

  it("бард, чародій, чорнокнижник — замовляння й відомі; клірик і друїд — лише замовляння; чарівник — замовляння й шість до книги", () => {
    expect(atCreation("BARD_2014")?.quota).toEqual({ cantrips: 2, prepared: 4, spellbook: 0, maxSpellLevel: 1 });
    expect(atCreation("SORCERER_2014")?.quota).toEqual({ cantrips: 4, prepared: 2, spellbook: 0, maxSpellLevel: 1 });
    expect(atCreation("WARLOCK_2014", "FIEND")?.quota).toEqual({ cantrips: 2, prepared: 2, spellbook: 0, maxSpellLevel: 1 });
    expect(atCreation("CLERIC_2014")?.quota).toEqual({ cantrips: 3, prepared: 0, spellbook: 0, maxSpellLevel: 1 });
    expect(atCreation("DRUID_2014")?.quota).toEqual({ cantrips: 2, prepared: 0, spellbook: 0, maxSpellLevel: 1 });
    expect(atCreation("WIZARD_2014")?.quota).toEqual({ cantrips: 3, prepared: 0, spellbook: 6, maxSpellLevel: 1 });
    expect(atCreation("WIZARD_2014")?.catchUp).toEqual(NONE);
  });

  it("паладин, слідопит і воїн на 1-му рівні кроку не мають", () => {
    expect(["PALADIN_2014", "RANGER_2014", "FIGHTER_2014", "ROGUE_2014"].map(hasCreationSpellChoice2014)).toEqual([false, false, false, false]);
    expect(["BARD_2014", "CLERIC_2014", "WIZARD_2014", "ARTIFICER_2014"].map(hasCreationSpellChoice2014)).toEqual([true, true, true, true]);
  });
});

describe("списки 2014 — клас, чарівник для третинних, розширений список покровителя", () => {
  it("третинний підклас бере зі списку чарівника, покровитель додає свій, решта — свій клас", () => {
    expect(findSpellLists2014(eldritchKnight)).toEqual({ base: "Чарівник", expanded: null });
    expect(findSpellLists2014({ className: "WARLOCK_2014", subclassName: "HEXBLADE" })).toEqual({ base: "Чорнокнижник", expanded: "Відьмацький клинок" });
    expect(findSpellLists2014({ className: "WARLOCK_2014", subclassName: null })).toEqual({ base: "Чорнокнижник", expanded: null });
    expect(findSpellLists2014({ className: "FIGHTER_2014", subclassName: "CHAMPION" })).toEqual({ base: "Воїн", expanded: null });
  });

  it("школи дунамантії додають чарівникові свій список, інші школи — ні", () => {
    const chronurgist = { className: "WIZARD_2014", subclassName: "SCHOOL_OF_CHRONURGY" };
    expect(findSpellLists2014(chronurgist)).toEqual({ base: "Чарівник", expanded: "Школа хронургії" });
    expect(findSpellLists2014({ className: "WIZARD_2014", subclassName: "SCHOOL_OF_GRAVITURGY" })).toEqual({ base: "Чарівник", expanded: "Школа гравітургії" });
    expect(findSpellLists2014({ className: "WIZARD_2014", subclassName: "SCHOOL_OF_EVOCATION" })).toEqual({ base: "Чарівник", expanded: null });
    expect(describeSpellListNote2014(chronurgist, findSpellLists2014(chronurgist))).toBe("зі свого списку й заклинань дунамантії («Школа хронургії»)");
  });

  it("підпис кроку називає, звідки список", () => {
    expect(describeSpellListNote2014(eldritchKnight, findSpellLists2014(eldritchKnight))).toBe("зі списку чарівника (Потойбічний лицар)");
    const hexblade = { className: "WARLOCK_2014", subclassName: "HEXBLADE" };
    expect(describeSpellListNote2014(hexblade, findSpellLists2014(hexblade))).toBe("зі свого списку й розширеного списку патрона «Відьмацький клинок»");
    expect(describeSpellListNote2014({ className: "BARD_2014", subclassName: null }, findSpellLists2014({ className: "BARD_2014", subclassName: null }))).toBe("зі свого списку");
  });

  it("у списку покровителя рядок без бейджа зі списку підкласу теж наявний", () => {
    const owned = [
      { level: 1, badgeText: null, excludeFromPreparedCount: false, spellLists: ["Чарівник", "Відьмацький клинок"] },
      { level: 1, badgeText: null, excludeFromPreparedCount: false, spellLists: ["Чарівник"] },
    ];
    expect(countOwnedClassSpells2014(owned, "Чорнокнижник", ["Чорнокнижник", "Відьмацький клинок"]).prepared).toBe(1);
    expect(countOwnedClassSpells2014(owned, "Чорнокнижник", ["Чорнокнижник"]).prepared).toBe(0);
  });

  it("фільтр із розширеним списком — обидві назви", () => {
    const quota = { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 2 };
    expect(buildClassSpellFilters2014({ lists: { base: "Чорнокнижник", expanded: "Відьмацький клинок" }, quota, schoolLimit: null }).spells).toEqual({
      levels: [1, 2],
      schools: null,
      spellList: ["Чорнокнижник", "Відьмацький клинок"],
    });
  });
});

describe("школи третинного підкласу 2014 — по одному «будь-якої школи» на 3, 8, 14 і 20-му рівнях", () => {
  it("Потойбічний лицар — Захист і Втілення, Містичний спритник — Причарування й Ілюзія; наявне поза школами зʼїдає дозвіл", () => {
    expect(findSchoolLimit2014({ caster: eldritchKnight, classLevel: 3, ownedOfClass: [] })).toEqual({ schools: ["ABJURATION", "EVOCATION"], outsideAllowed: 1 });
    expect(findSchoolLimit2014({ caster: arcaneTrickster, classLevel: 3, ownedOfClass: [] })).toEqual({ schools: ["ENCHANTMENT", "ILLUSION"], outsideAllowed: 1 });
    expect(findSchoolLimit2014({ caster: eldritchKnight, classLevel: 5, ownedOfClass: [wizardOwned(1, "CONJURATION"), wizardOwned(1, "EVOCATION")] })?.outsideAllowed).toBe(0);
    expect(findSchoolLimit2014({ caster: eldritchKnight, classLevel: 8, ownedOfClass: [wizardOwned(1, "CONJURATION"), wizardOwned(0, "CONJURATION")] })?.outsideAllowed).toBe(1);
    expect(findSchoolLimit2014({ caster: eldritchKnight, classLevel: 20, ownedOfClass: [] })?.outsideAllowed).toBe(4);
    expect(findSchoolLimit2014({ caster: { className: "FIGHTER_2014", subclassName: "CHAMPION" }, classLevel: 3, ownedOfClass: [] })).toBeNull();
    expect(findSchoolLimit2014({ caster: { className: "WIZARD_2014", subclassName: "ELDRITCH_KNIGHT" }, classLevel: 3, ownedOfClass: [] })).toBeNull();
  });

  it("без дозволу поза школами фільтр звужується до шкіл підкласу, з дозволом — показує всі", () => {
    const quota = { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 1 };
    const lists = { base: "Чарівник", expanded: null };
    expect(buildClassSpellFilters2014({ lists, quota, schoolLimit: { schools: ["ABJURATION", "EVOCATION"], outsideAllowed: 0 } }).spells.schools).toEqual(["ABJURATION", "EVOCATION"]);
    expect(buildClassSpellFilters2014({ lists, quota, schoolLimit: { schools: ["ABJURATION", "EVOCATION"], outsideAllowed: 1 } }).spells.schools).toBeNull();
  });

  it("перевірка: понад дозвіл — відмова, заміна прибраного поза школами звільняє місце", () => {
    const limit = { schools: ["ABJURATION", "EVOCATION"] as const, outsideAllowed: 1 };
    const candidates = [
      { spellId: 1, level: 1, school: "ABJURATION" },
      { spellId: 2, level: 1, school: "CONJURATION" },
      { spellId: 3, level: 1, school: "ILLUSION" },
    ];
    const droppable = [{ spellId: 9, level: 1, school: "NECROMANCY" }];
    const check = (preparedIds: number[], preparedSwap?: { dropId: number; addId: number }) =>
      findSchoolLimitProblem({ limit, selection: { cantripIds: [], spellbookIds: [], preparedIds, preparedSwap }, candidates, droppable });

    expect(check([1, 2])).toBeNull();
    expect(check([2, 3])).toBe("Поза школами «Захист» і «Втілення» можна взяти не більше 1");
    expect(check([2, 3], { dropId: 9, addId: 1 })).toBeNull();
    expect(check([2], { dropId: 9, addId: 3 })).toBeNull();
    expect(check([2, 3], { dropId: 9, addId: 1 })).toBeNull();
    expect(findSchoolLimitProblem({ limit: { ...limit, outsideAllowed: 0 }, selection: { cantripIds: [], spellbookIds: [], preparedIds: [2] }, candidates, droppable })).toBe("Підклас дає лише школи «Захист» і «Втілення»");
    expect(findSchoolLimitProblem({ limit: null, selection: { cantripIds: [], spellbookIds: [], preparedIds: [2, 3] }, candidates, droppable })).toBeNull();
  });

  it("підказка кроку", () => {
    expect(describeSchoolLimit2014({ schools: ["ENCHANTMENT", "ILLUSION"], outsideAllowed: 1 })).toBe("Школи підкласу — «Причарування» і «Ілюзія»; поза ними можна взяти ще 1.");
    expect(describeSchoolLimit2014({ schools: ["ABJURATION", "EVOCATION"], outsideAllowed: 0 })).toBe("Лише школи «Захист» і «Втілення»: заклинання будь-якої школи підклас дає на 3, 8, 14 і 20-му рівнях.");
  });
});

describe("перевірка вибору 2014 — від обовʼязкової прибавки до норми таблиці", () => {
  const quota = { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 3 };
  const catchUp = { cantrips: 1, prepared: 2, spellbook: 0 };
  const bardList = ["Бард"];
  const candidates = [
    { spellId: 1, level: 0, school: "EVOCATION", spellLists: bardList },
    ...[11, 12, 13, 14].map((spellId) => ({ spellId, level: 1, school: "EVOCATION", spellLists: bardList })),
  ];
  const check = (cantripIds: number[], preparedIds: number[]) =>
    findClassSpellSelectionProblem({
      quota,
      filters: buildClassSpellFilters2014({ lists: { base: "Бард", expanded: null }, quota, schoolLimit: null }),
      selection: { cantripIds, spellbookIds: [], preparedIds },
      candidates,
      usesSpellbook: false,
      bookSpellIds: [],
      unavailableSpellIds: [],
      catchUp,
      spellsCountLabel: "нових заклинань",
    });

  it("приймає від прибавки до норми таблиці", () => {
    expect(check([], [11])).toBeNull();
    expect(check([1], [11, 12, 13])).toBeNull();
  });

  it("без прибавки, понад норму й двічі одне — відмова", () => {
    expect(check([], [])).toBe("Оберіть нових заклинань: щонайменше 1");
    expect(check([], [11, 12, 13, 14])).toBe("Оберіть нових заклинань: не більше 3");
    expect(check([], [11, 11])).toBe("Одне заклинання обрано двічі");
  });
});

describe("уже наявні заклинання класу 2014", () => {
  it("рахується бейдж класу й рядок без бейджа зі списку класу; рядок іншого джерела й чужого списку — ні", () => {
    const owned = [
      { level: 0, badgeText: null, excludeFromPreparedCount: false, spellLists: ["Бард", "Чарівник"] },
      { level: 1, badgeText: "Бард", excludeFromPreparedCount: false, spellLists: ["Бард"] },
      { level: 1, badgeText: null, excludeFromPreparedCount: false, spellLists: ["Бард"] },
      { level: 1, badgeText: null, excludeFromPreparedCount: false, spellLists: ["Клірик"] },
      { level: 1, badgeText: "Високий ельф", excludeFromPreparedCount: true, spellLists: ["Бард"] },
      { level: 2, badgeText: "Домен бурі", excludeFromPreparedCount: false, spellLists: ["Бард"] },
    ];
    expect(countOwnedClassSpells2014(owned, "Бард", ["Бард"])).toEqual({ cantrips: 1, prepared: 2, spellbook: 2 });
  });

  it("Потойбічний лицар: бейдж воїна або рядок без бейджа зі списку чарівника", () => {
    const owned = [wizardOwned(1, "EVOCATION", "Воїн"), wizardOwned(1, "EVOCATION", null), { ...wizardOwned(1, "EVOCATION", null), spellLists: ["Бард"] }];
    expect(countOwnedClassSpells2014(owned, "Воїн", ["Чарівник"]).prepared).toBe(2);
  });

  it("заміну на рівні мають класи, що знають заклинання, і третинні підкласи", () => {
    expect(["BARD_2014", "SORCERER_2014", "WARLOCK_2014", "RANGER_2014"].every((className) => canSwapKnownSpellOnLevel2014(className))).toBe(true);
    expect(["CLERIC_2014", "DRUID_2014", "PALADIN_2014", "WIZARD_2014", "BARD_2024"].some((className) => canSwapKnownSpellOnLevel2014(className))).toBe(false);
    expect(canSwapKnownSpellOnLevel2014("FIGHTER_2014", "ELDRITCH_KNIGHT")).toBe(true);
    expect(canSwapKnownSpellOnLevel2014("FIGHTER_2014", "CHAMPION")).toBe(false);
  });

  it("список заклинань — назва класу, рівні до найвищого доступного", () => {
    const filters = buildClassSpellFilters2014({ lists: { base: "Чорнокнижник", expanded: null }, quota: { cantrips: 0, prepared: 1, spellbook: 0, maxSpellLevel: 3 }, schoolLimit: null });
    expect(filters).toEqual({
      cantrips: { levels: [0], schools: null, spellList: "Чорнокнижник" },
      spells: { levels: [1, 2, 3], schools: null, spellList: "Чорнокнижник" },
    });
  });
});
