import { describe, expect, it } from "vitest";

import type { CharacterFeaturesGroupedResult, PersWithRelations } from "@/lib/actions/pers";
import type { OfflineOperation } from "@/lib/offline/operations";
import { applyQueuedOperationsToSheet } from "@/lib/offline/sheet-state";

function operation<TKind extends OfflineOperation["kind"]>(
  value: Omit<Extract<OfflineOperation, { kind: TKind }>, "operationId" | "persId" | "createdAt">,
  index = 1,
): OfflineOperation {
  return { ...value, operationId: `op-sheet-${String(index).padStart(8, "0")}`, persId: 42, createdAt: "2026-09-18T00:00:00.000Z" } as OfflineOperation;
}

// Чарівник 5-го рівня: стеля комірок 1-го рівня — 4.
const wizard = {
  persId: 42,
  level: 5,
  ruleset: "RULES_2014",
  currentHp: 20,
  maxHp: 30,
  tempHp: 0,
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  isDead: false,
  currentSpellSlots: [4, 3, 2],
  currentPactSlots: 0,
  heroicInspirationCount: 0,
  canStackHeroicInspiration: false,
  currentHitDice: { 12: 5 },
  class: { classId: 12, name: "WIZARD_2014", spellcastingType: "FULL" },
  subclass: null,
  multiclasses: [],
  magicItems: [{ persMagicItemId: 7, chargesMax: 7, chargesCurrent: 7 }],
  persSpells: [{ spellId: 100, isPrepared: false }],
  homebrewSpells: [{ homebrewEntryId: 9, isPrepared: false }],
} as unknown as PersWithRelations;

const grouped = {
  actions: [{ key: "a", featureId: 1, usesPoolKey: "pool", usesRemaining: 3, usesPer: 3, usePrice: 1 }],
  bonusActions: [{ key: "b", featureId: 2, usesPoolKey: "pool", usesRemaining: 3, usesPer: 3, usePrice: 1 }],
  reactions: [],
  passive: [{ key: "c", featureId: 3, usesRemaining: 1, usesPer: 2, usePrice: 1 }],
} as unknown as CharacterFeaturesGroupedResult;

describe("Офлайн-аудит 2026-09-18 — черга складається поверх усього листа з кешу", () => {
  it("порожня черга або чужі операції повертають ті самі обʼєкти", () => {
    expect(applyQueuedOperationsToSheet(wizard, grouped, [])).toEqual({ pers: wizard, groupedFeatures: grouped });
    const foreign = { ...operation({ kind: "hp", mode: "damage", amount: 3 }), persId: 43 };
    expect(applyQueuedOperationsToSheet(wizard, grouped, [foreign]).pers).toBe(wizard);
  });

  it("відновлення комірки впирається в стелю з прогресії класу, а не в число з черги", () => {
    const spentTwice = [operation({ kind: "spend-spell-slot", slotLevel: 1 }, 1), operation({ kind: "spend-spell-slot", slotLevel: 1 }, 2)];
    const restoredThrice = [3, 4, 5].map((index) => operation({ kind: "restore-spell-slot", slotLevel: 1 }, index));

    const { pers } = applyQueuedOperationsToSheet(wizard, grouped, [...spentTwice, ...restoredThrice]);
    expect(pers.currentSpellSlots[0]).toBe(4);
  });

  it("заряди, підготовка звичайного й домашнього заклинання та хіт-дайси лягають на звʼязки", () => {
    const { pers } = applyQueuedOperationsToSheet(wizard, grouped, [
      operation({ kind: "magic-item-charges", persMagicItemId: 7, step: -2 }, 1),
      operation({ kind: "spell-prepared", spellId: 100, isPrepared: true }, 2),
      operation({ kind: "spell-prepared", spellId: -9, isPrepared: true }, 3),
      operation({ kind: "hit-dice", remainingByClass: { 12: 2 } }, 4),
    ]);

    expect(pers.magicItems[0].chargesCurrent).toBe(5);
    expect(pers.persSpells[0].isPrepared).toBe(true);
    expect(pers.homebrewSpells[0].isPrepared).toBe(true);
    expect(pers.currentHitDice).toEqual({ 12: 2 });
  });

  it("пул ресурсу рухається через межі груп рис", () => {
    const { groupedFeatures } = applyQueuedOperationsToSheet(wizard, grouped, [
      operation({ kind: "feature-use", featureId: 1, direction: "spend" }, 1),
      operation({ kind: "feature-use", featureId: 3, direction: "restore" }, 2),
    ]);

    expect(groupedFeatures?.actions[0].usesRemaining).toBe(2);
    expect(groupedFeatures?.bonusActions[0].usesRemaining).toBe(2);
    expect(groupedFeatures?.passive[0].usesRemaining).toBe(2);
    expect(groupedFeatures?.reactions).toEqual([]);
  });
});

// Чарівник 5-го рівня 2014 з d6: довгий відпочинок повертає половину кубиків — два з пʼяти.
const restingWizard = {
  ...wizard,
  currentHp: 12,
  tempHp: 4,
  deathSaveFailures: 2,
  currentSpellSlots: [0, 0, 0],
  currentHitDice: { 12: 1 },
  class: { classId: 12, name: "WIZARD_2014", spellcastingType: "FULL", hitDie: 6 },
  features: [],
} as unknown as PersWithRelations;

const restingFeatures = {
  actions: [{ key: "a", featureId: 1, usesPoolKey: "pool", usesRemaining: 0, usesPer: 3, restType: "SHORT_REST" }],
  bonusActions: [{ key: "b", featureId: 2, usesPoolKey: "pool", usesRemaining: 0, usesPer: 3, restType: "SHORT_REST" }],
  reactions: [{ key: "e", featureId: 5, usesRemaining: 0, usesPer: 3, restType: "SHORT_REST", regainsOneUseOnShortRest: true }],
  passive: [
    { key: "c", featureId: 3, usesRemaining: 1, usesPer: 2, usePrice: 1, restType: "LONG_REST" },
    { key: "d", featureId: 4, usesRemaining: 0, usesPer: 2, restType: null },
  ],
} as unknown as CharacterFeaturesGroupedResult;

describe("Відпочинок у офлайн-черзі — лист показує те, що порахує сервер", () => {
  it("довгий відпочинок: хіти, комірки з прогресії, половина кубиків 2014 і ресурси обох типів", () => {
    const { pers, groupedFeatures } = applyQueuedOperationsToSheet(restingWizard, restingFeatures, [operation({ kind: "long-rest" })]);

    expect(pers).toMatchObject({ currentHp: 30, tempHp: 0, deathSaveFailures: 0, isDead: false, currentPactSlots: 0 });
    expect(pers.currentSpellSlots).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(pers.currentHitDice).toEqual({ 12: 3 });
    expect(groupedFeatures?.actions[0].usesRemaining).toBe(3);
    expect(groupedFeatures?.reactions[0].usesRemaining).toBe(3);
    expect(groupedFeatures?.passive.map((item) => item.usesRemaining)).toEqual([2, 0]);
  });

  it("короткий відпочинок: кинуті хіти, списані кубики, ресурс короткого відпочинку, одне використання для рис 2024", () => {
    const { pers, groupedFeatures } = applyQueuedOperationsToSheet(
      { ...restingWizard, currentHitDice: { 12: 3 } } as PersWithRelations,
      restingFeatures,
      [operation({ kind: "short-rest", hitDiceSpent: [{ classId: 12, count: 2 }], restoredHitPoints: 9 })],
    );

    expect(pers.currentHp).toBe(21);
    expect(pers.currentHitDice).toEqual({ 12: 1 });
    expect(groupedFeatures?.actions[0].usesRemaining).toBe(3);
    expect(groupedFeatures?.bonusActions[0].usesRemaining).toBe(3);
    expect(groupedFeatures?.reactions[0].usesRemaining).toBe(1);
    expect(groupedFeatures?.passive.map((item) => item.usesRemaining)).toEqual([1, 0]);
  });

  it("короткий відпочинок не лікує вище максимуму", () => {
    const { pers } = applyQueuedOperationsToSheet(restingWizard, restingFeatures, [
      operation({ kind: "short-rest", hitDiceSpent: [{ classId: 12, count: 1 }], restoredHitPoints: 100 }),
    ]);
    expect(pers.currentHp).toBe(30);
  });

  it("кубиків менше, ніж списується, — лист не змінюється, як і база, що операцію відхилить", () => {
    const sheet = applyQueuedOperationsToSheet(restingWizard, restingFeatures, [
      operation({ kind: "short-rest", hitDiceSpent: [{ classId: 12, count: 2 }], restoredHitPoints: 9 }),
    ]);
    expect(sheet.pers.currentHp).toBe(12);
    expect(sheet.pers.currentHitDice).toEqual({ 12: 1 });
    expect(sheet.groupedFeatures?.actions[0].usesRemaining).toBe(0);
  });

  it("короткий відпочинок повертає чаклуну комірки пакту", () => {
    const warlock = {
      ...restingWizard,
      level: 3,
      currentHitDice: { 9: 3 },
      class: { classId: 9, name: "WARLOCK_2014", spellcastingType: "PACT", hitDie: 8 },
      currentPactSlots: 0,
    } as unknown as PersWithRelations;

    const { pers } = applyQueuedOperationsToSheet(warlock, null, [
      operation({ kind: "short-rest", hitDiceSpent: [], restoredHitPoints: 0 }),
    ]);
    expect(pers.currentPactSlots).toBe(2);
  });

  it("операції накладаються по порядку: відпочинок між двома витратами відновлює лише першу", () => {
    const spendLongRestFeature = (index: number) => operation({ kind: "feature-use", featureId: 3, direction: "spend" }, index);

    const afterLongRest = applyQueuedOperationsToSheet(restingWizard, restingFeatures, [
      spendLongRestFeature(1),
      operation({ kind: "long-rest" }, 2),
      spendLongRestFeature(3),
    ]);
    expect(afterLongRest.groupedFeatures?.passive[0].usesRemaining).toBe(1);

    const afterShortRest = applyQueuedOperationsToSheet(restingWizard, restingFeatures, [
      spendLongRestFeature(1),
      operation({ kind: "short-rest", hitDiceSpent: [], restoredHitPoints: 0 }, 2),
      spendLongRestFeature(3),
    ]);
    expect(afterShortRest.groupedFeatures?.passive[0].usesRemaining).toBe(0);
  });
});

// O38. Варвар із Люттю (рядок pers_feature є) і лічильником 3/3 на слайді Рис.
const barbarian = {
  ...restingWizard,
  features: [{ persFeatureId: 1, featureId: 10, usesRemaining: 3, isActive: false, feature: { featureId: 10, engName: "Rage" } }],
} as unknown as PersWithRelations;

const rageFeatures = {
  actions: [],
  bonusActions: [{ key: "rage", featureId: 10, usesRemaining: 3, usesPer: 3, usePrice: 1, restType: "LONG_REST" }],
  reactions: [],
  passive: [],
} as unknown as CharacterFeaturesGroupedResult;

describe("O38 — стан риси в офлайн-черзі", () => {
  it("увімкнення вмикає рису на листі й списує одне використання", () => {
    const { pers, groupedFeatures } = applyQueuedOperationsToSheet(barbarian, rageFeatures, [
      operation({ kind: "feature-state", featureId: 10, isActive: true }),
    ]);

    expect(pers.features[0].isActive).toBe(true);
    expect(groupedFeatures?.bonusActions[0].usesRemaining).toBe(2);
  });

  it("повторне увімкнення нічого не списує", () => {
    const { groupedFeatures } = applyQueuedOperationsToSheet(barbarian, rageFeatures, [
      operation({ kind: "feature-state", featureId: 10, isActive: true }, 1),
      operation({ kind: "feature-state", featureId: 10, isActive: true }, 2),
    ]);

    expect(groupedFeatures?.bonusActions[0].usesRemaining).toBe(2);
  });

  it("вимкнення не повертає використання, а відпочинок гасить стан", () => {
    const toggled = applyQueuedOperationsToSheet(barbarian, rageFeatures, [
      operation({ kind: "feature-state", featureId: 10, isActive: true }, 1),
      operation({ kind: "feature-state", featureId: 10, isActive: false }, 2),
    ]);
    expect(toggled.pers.features[0].isActive).toBe(false);
    expect(toggled.groupedFeatures?.bonusActions[0].usesRemaining).toBe(2);

    const rested = applyQueuedOperationsToSheet(barbarian, rageFeatures, [
      operation({ kind: "feature-state", featureId: 10, isActive: true }, 1),
      operation({ kind: "short-rest", hitDiceSpent: [], restoredHitPoints: 0 }, 2),
    ]);
    expect(rested.pers.features[0].isActive).toBe(false);
  });
});

describe("O38 — Шаленство 2014 в офлайн-черзі", () => {
  const berserker = {
    ...restingWizard,
    features: [
      { persFeatureId: 1, featureId: 10, usesRemaining: 3, isActive: false, feature: { featureId: 10, engName: "Rage" } },
      { persFeatureId: 2, featureId: 11, usesRemaining: null, isActive: false, feature: { featureId: 11, engName: "Frenzy" } },
    ],
  } as unknown as PersWithRelations;

  it("без Люті Шаленство не вмикається", () => {
    const { pers } = applyQueuedOperationsToSheet(berserker, rageFeatures, [operation({ kind: "feature-state", featureId: 11, isActive: true })]);
    expect(pers.features.map((row) => row.isActive)).toEqual([false, false]);
  });

  it("вимкнення Люті гасить і Шаленство", () => {
    const { pers } = applyQueuedOperationsToSheet(berserker, rageFeatures, [
      operation({ kind: "feature-state", featureId: 10, isActive: true }, 1),
      operation({ kind: "feature-state", featureId: 11, isActive: true }, 2),
      operation({ kind: "feature-state", featureId: 10, isActive: false }, 3),
    ]);
    expect(pers.features.map((row) => row.isActive)).toEqual([false, false]);
  });
});

// O39. Чарівник із двома заклинаннями в списку — назву для чипа офлайн бере звідти.
describe("O39 — концентрація, бафи й виснаження в офлайн-черзі", () => {
  const haste = { spellId: 501, name: "Прискорення [Haste]", engName: "Haste", hasConcentration: "так" };
  const bless = { spellId: 502, name: "Благословення [Bless]", engName: "Bless", hasConcentration: "так" };
  const caster = {
    ...restingWizard,
    ruleset: "RULES_2024",
    exhaustionLevel: 0,
    effects: [],
    persSpells: [{ spellId: 501, spell: haste }, { spellId: 502, spell: bless }],
  } as unknown as PersWithRelations;
  const keys = (pers: PersWithRelations) => pers.effects.map((row) => row.effectKey).sort();

  it("нова концентрація зриває попередню разом із бафом, що на ній тримався", () => {
    const { pers } = applyQueuedOperationsToSheet(caster, rageFeatures, [
      operation({ kind: "concentration", spellId: 501 }, 1),
      operation({ kind: "spell-buff", effectKey: "HASTE", isActive: true, spellId: 501, endsWithConcentration: true }, 2),
      operation({ kind: "spell-buff", effectKey: "MAGE_ARMOR", isActive: true, spellId: null, endsWithConcentration: false }, 3),
      operation({ kind: "concentration", spellId: 502 }, 4),
    ]);

    expect(keys(pers)).toEqual(["CONCENTRATION", "MAGE_ARMOR"]);
    expect(pers.effects.find((row) => row.effectKey === "CONCENTRATION")?.spell?.name).toBe("Благословення [Bless]");
  });

  it("короткий відпочинок лишає Обладунок мага, довгий знімає все й один рівень виснаження", () => {
    const buffed = [
      operation({ kind: "concentration", spellId: 501 }, 1),
      operation({ kind: "spell-buff", effectKey: "MAGE_ARMOR", isActive: true, spellId: null, endsWithConcentration: false }, 2),
      operation({ kind: "exhaustion", level: 3 }, 3),
    ];
    const short = applyQueuedOperationsToSheet(caster, rageFeatures, [...buffed, operation({ kind: "short-rest", hitDiceSpent: [], restoredHitPoints: 0 }, 4)]);
    expect(keys(short.pers)).toEqual(["MAGE_ARMOR"]);
    expect(short.pers.exhaustionLevel).toBe(3);

    const long = applyQueuedOperationsToSheet(caster, rageFeatures, [...buffed, operation({ kind: "long-rest" }, 4)]);
    expect(keys(long.pers)).toEqual([]);
    expect(long.pers.exhaustionLevel).toBe(2);
  });

  it("увімкнення Люті знімає концентрацію", () => {
    const ragingCaster = { ...caster, features: barbarian.features } as unknown as PersWithRelations;
    const { pers } = applyQueuedOperationsToSheet(ragingCaster, rageFeatures, [
      operation({ kind: "concentration", spellId: 501 }, 1),
      operation({ kind: "feature-state", featureId: 10, isActive: true }, 2),
    ]);
    expect(keys(pers)).toEqual([]);
  });

  it("виснаження тримається в межах 0–6", () => {
    const { pers } = applyQueuedOperationsToSheet(caster, rageFeatures, [operation({ kind: "exhaustion", level: 9 })]);
    expect(pers.exhaustionLevel).toBe(6);
  });
});
