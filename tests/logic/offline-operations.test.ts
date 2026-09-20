import { describe, expect, it } from "vitest";

import {
  applyOfflineOperation,
  applyQueuedFeatureUses,
  applyQueuedItemCharges,
  applyQueuedOperations,
  applyQueuedSpellPreparation,
  isOfflineOperation,
  normalizePersDetails,
  type OfflineOperation,
  type OfflinePersState,
} from "@/lib/offline/operations";

const BASE: OfflinePersState = {
  persId: 42,
  currentHp: 20,
  maxHp: 30,
  tempHp: 5,
  deathSaveSuccesses: 1,
  deathSaveFailures: 1,
  isDead: false,
  currentSpellSlots: [2, 1],
  maxSpellSlots: [4, 3],
  currentPactSlots: 1,
  maxPactSlots: 2,
  heroicInspirationCount: 0,
  canStackHeroicInspiration: false,
};

function operation<TKind extends OfflineOperation["kind"]>(
  value: Omit<Extract<OfflineOperation, { kind: TKind }>, "operationId" | "persId" | "createdAt">,
): Extract<OfflineOperation, { kind: TKind }> {
  return {
    ...value,
    operationId: "00000000-0000-4000-8000-000000000001",
    persId: 42,
    createdAt: "2026-08-30T00:00:00.000Z",
  } as Extract<OfflineOperation, { kind: TKind }>;
}

describe("KR22.6 — локальне застосування офлайн-операцій", () => {
  it("шкода спершу знімає тимчасові хіти", () => {
    const next = applyOfflineOperation(BASE, operation({ kind: "hp", mode: "damage", amount: 7 }));
    expect(next).toMatchObject({ currentHp: 18, tempHp: 0 });
  });

  it("лікування не піднімає хіти вище максимуму", () => {
    const next = applyOfflineOperation(BASE, operation({ kind: "hp", mode: "heal", amount: 100 }));
    expect(next.currentHp).toBe(30);
  });

  it("тимчасові хіти не додаються, а беруть більше значення", () => {
    const next = applyOfflineOperation(BASE, operation({ kind: "hp", mode: "temp", amount: 3 }));
    expect(next.tempHp).toBe(5);
  });

  it("падіння до нуля лишає кидки смерті, підйом вище нуля їх скидає", () => {
    const downed = applyOfflineOperation(BASE, operation({ kind: "hp", mode: "damage", amount: 40 }));
    expect(downed).toMatchObject({ currentHp: 0, deathSaveSuccesses: 1, deathSaveFailures: 1 });

    const healed = applyOfflineOperation(downed, operation({ kind: "hp", mode: "heal", amount: 1 }));
    expect(healed).toMatchObject({ currentHp: 1, deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false });
  });

  it("частковий details-запис не затирає решту листа", () => {
    const next = applyOfflineOperation(BASE, operation({ kind: "details", patch: { notes: "чернетка", gp: "12" } }));
    expect(next).toMatchObject({ notes: "чернетка", gp: "12", currentHp: 20 });
  });

  it("третій успішний death save стабілізує персонажа", () => {
    const next = applyOfflineOperation(BASE, operation({ kind: "death-saves", successes: 3, failures: 1 }));
    expect(next).toMatchObject({ currentHp: 1, deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false });
  });

  it("третій провалений death save вбиває персонажа", () => {
    const next = applyOfflineOperation(BASE, operation({ kind: "death-saves", successes: 1, failures: 3 }));
    expect(next).toMatchObject({ isDead: true, deathSaveFailures: 3 });
  });

  it("витрата комірки знімає рівно одну з потрібного рівня", () => {
    const next = applyOfflineOperation(BASE, operation({ kind: "spend-spell-slot", slotLevel: 1 }));
    expect(next.currentSpellSlots.slice(0, 2)).toEqual([1, 1]);
  });

  it("комірки не йдуть нижче нуля", () => {
    const spent = applyOfflineOperation(
      { ...BASE, currentSpellSlots: [0] },
      operation({ kind: "spend-spell-slot", slotLevel: 1 }),
    );
    expect(spent.currentSpellSlots[0]).toBe(0);
  });

  it("комірка пакту не йде нижче нуля", () => {
    const spent = applyOfflineOperation({ ...BASE, currentPactSlots: 0 }, operation({ kind: "spend-pact-slot" }));
    expect(spent.currentPactSlots).toBe(0);
  });

  it("операція для іншого персонажа не застосовується", () => {
    const foreign = { ...operation({ kind: "hp", mode: "damage", amount: 7 }), persId: 43 };
    expect(applyOfflineOperation(BASE, foreign)).toBe(BASE);
  });
});

describe("KR22.6 — відтворення черги поверх стану з кешу", () => {
  it("складає всі незбережені операції на стан, з яким сторінка приїхала з кешу", () => {
    const next = applyQueuedOperations(BASE, [
      operation({ kind: "hp", mode: "damage", amount: 7 }),
      operation({ kind: "spend-spell-slot", slotLevel: 1 }),
      operation({ kind: "details", patch: { notes: "у підземеллі" } }),
    ]);

    expect(next).toMatchObject({ currentHp: 18, tempHp: 0, notes: "у підземеллі" });
    expect(next.currentSpellSlots.slice(0, 2)).toEqual([1, 1]);
  });

  it("операції інших персонажів у черзі не чіпають цей лист", () => {
    const foreign = { ...operation({ kind: "hp", mode: "damage", amount: 7 }), persId: 43 };
    expect(applyQueuedOperations(BASE, [foreign])).toBe(BASE);
  });

  it("порожня черга лишає стан незмінним", () => {
    expect(applyQueuedOperations(BASE, [])).toBe(BASE);
  });
});

describe("KR22.6 — нормалізація полів листа (спільна для онлайну й черги)", () => {
  it("обрізає світогляд до ста символів", () => {
    expect(normalizePersDetails({ alignment: "Л".repeat(101) }).alignment).toHaveLength(100);
  });

  it("XP і монети не бувають відʼємними й дробовими", () => {
    expect(normalizePersDetails({ xp: 17.9, cp: "-5", gp: "42 золотих" })).toMatchObject({
      xp: 17,
      cp: "0",
      gp: "42",
    });
  });

  it("не чіпає полів, яких у правці немає", () => {
    expect(normalizePersDetails({ notes: "лише нотатка" })).toEqual({ notes: "лише нотатка" });
  });
});

describe("KR22.6 — розпізнавання операцій із черги", () => {
  const valid = operation({ kind: "hp", mode: "damage", amount: 7 });

  it("приймає коректну операцію", () => {
    expect(isOfflineOperation(valid)).toBe(true);
  });

  it("відкидає невідомий вид, чужий формат і сміття зі сховища", () => {
    expect(isOfflineOperation({ ...valid, kind: "rest" })).toBe(false);
    expect(isOfflineOperation({ ...valid, operationId: "" })).toBe(false);
    expect(isOfflineOperation({ ...valid, persId: 0 })).toBe(false);
    expect(isOfflineOperation({ ...valid, createdAt: "не дата" })).toBe(false);
    expect(isOfflineOperation(null)).toBe(false);
    expect(isOfflineOperation("hp")).toBe(false);
  });
});

describe("Натхнення в офлайн-черзі", () => {
  it("без стакання тримає 0..1 і не чіпає решти стану", () => {
    const gained = applyOfflineOperation(BASE, operation({ kind: "heroic-inspiration", heroicInspirationCount: 3 }));
    expect(gained.heroicInspirationCount).toBe(1);

    const spent = applyOfflineOperation(gained, operation({ kind: "heroic-inspiration", heroicInspirationCount: 0 }));
    expect(spent.heroicInspirationCount).toBe(0);
    expect(spent).toMatchObject({ currentHp: 20, tempHp: 5, currentPactSlots: 1 });
  });

  it("зі стаканням накопичує", () => {
    const stacking = { ...BASE, canStackHeroicInspiration: true };
    expect(applyOfflineOperation(stacking, operation({ kind: "heroic-inspiration", heroicInspirationCount: 3 })).heroicInspirationCount).toBe(3);
    expect(applyOfflineOperation(stacking, operation({ kind: "heroic-inspiration", heroicInspirationCount: -1 })).heroicInspirationCount).toBe(0);
  });

  it("приймає лише ціле число", () => {
    const valid = operation({ kind: "heroic-inspiration", heroicInspirationCount: 2 });
    expect(isOfflineOperation(valid)).toBe(true);
    expect(isOfflineOperation({ ...valid, heroicInspirationCount: 1.5 })).toBe(false);
    expect(isOfflineOperation({ ...valid, heroicInspirationCount: "2" })).toBe(false);
    expect(isOfflineOperation({ ...valid, heroicInspirationCount: undefined })).toBe(false);
  });
});

describe("Офлайн-аудит 2026-09-18 — відновлення комірок зі стелею на вході", () => {
  it("відновлення додає одну комірку й не перевищує стелі", () => {
    const restored = applyOfflineOperation(BASE, operation({ kind: "restore-spell-slot", slotLevel: 1 }));
    expect(restored.currentSpellSlots.slice(0, 2)).toEqual([3, 1]);

    const full = applyOfflineOperation({ ...BASE, currentSpellSlots: [4, 1] }, operation({ kind: "restore-spell-slot", slotLevel: 1 }));
    expect(full.currentSpellSlots[0]).toBe(4);
  });

  it("комірка вище стелі не зрізається відновленням, а витрата не дивиться на стелю", () => {
    const above = applyOfflineOperation({ ...BASE, currentSpellSlots: [5, 1] }, operation({ kind: "restore-spell-slot", slotLevel: 1 }));
    expect(above.currentSpellSlots[0]).toBe(5);

    const spent = applyOfflineOperation({ ...BASE, currentSpellSlots: [5, 1] }, operation({ kind: "spend-spell-slot", slotLevel: 1 }));
    expect(spent.currentSpellSlots[0]).toBe(4);
  });

  it("комірка пакту відновлюється до стелі й не далі", () => {
    const restored = applyOfflineOperation(BASE, operation({ kind: "restore-pact-slot" }));
    expect(restored.currentPactSlots).toBe(2);
    expect(applyOfflineOperation(restored, operation({ kind: "restore-pact-slot" })).currentPactSlots).toBe(2);
  });

  it("хіт-дайси записуються як залишок по класах, сміття відкидається", () => {
    const next = applyOfflineOperation(BASE, operation({ kind: "hit-dice", remainingByClass: { 3: 2, abc: 9, 7: -1 } }));
    expect(next.currentHitDice).toEqual({ 3: 2, 7: 0 });
  });
});

describe("Офлайн-аудит 2026-09-18 — ресурси рис, заряди й підготовка поверх кешу", () => {
  const items = [
    { key: "rage", featureId: 10, usesRemaining: 2, usesPer: 3, usePrice: 1 },
    { key: "ki-a", featureId: 20, usesPoolKey: "ki", usesRemaining: 4, usesPer: 5, usePrice: 1 },
    { key: "ki-b", featureId: 21, usesPoolKey: "ki", usesRemaining: 4, usesPer: 5, usePrice: 2 },
    { key: "fresh", featureId: 30, usesRemaining: null, usesPer: 2 },
  ];

  it("витрата знімає ціну, відновлення повертає до стелі", () => {
    const spent = applyQueuedFeatureUses(items, 42, [operation({ kind: "feature-use", featureId: 10, direction: "spend" })]);
    expect(spent[0].usesRemaining).toBe(1);

    const restored = applyQueuedFeatureUses(items, 42, [
      operation({ kind: "feature-use", featureId: 10, direction: "restore" }),
      operation({ kind: "feature-use", featureId: 10, direction: "restore" }),
    ]);
    expect(restored[0].usesRemaining).toBe(3);
  });

  it("пул рухається разом для всіх рис із тим самим ключем", () => {
    const spent = applyQueuedFeatureUses(items, 42, [operation({ kind: "feature-use", featureId: 21, direction: "spend" })]);
    expect(spent[1].usesRemaining).toBe(2);
    expect(spent[2].usesRemaining).toBe(2);
    expect(spent[0].usesRemaining).toBe(2);
  });

  it("ресурс без рядка в базі стартує зі стелі, а дорожча за залишок витрата не проходить", () => {
    const spent = applyQueuedFeatureUses(items, 42, [operation({ kind: "feature-use", featureId: 30, direction: "spend" })]);
    expect(spent[3].usesRemaining).toBe(1);

    const tooExpensive = applyQueuedFeatureUses(
      [{ key: "x", featureId: 40, usesRemaining: 1, usesPer: 3, usePrice: 2 }],
      42,
      [operation({ kind: "feature-use", featureId: 40, direction: "spend" })],
    );
    expect(tooExpensive[0].usesRemaining).toBe(1);
  });

  it("заряди предмета крокують у межах стелі, чужий персонаж не чіпається", () => {
    const wands = [{ persMagicItemId: 7, chargesMax: 7, chargesCurrent: 1 }];
    const stepped = applyQueuedItemCharges(wands, 42, [
      operation({ kind: "magic-item-charges", persMagicItemId: 7, step: -1 }),
      operation({ kind: "magic-item-charges", persMagicItemId: 7, step: -1 }),
      operation({ kind: "magic-item-charges", persMagicItemId: 7, step: 9 }),
    ]);
    expect(stepped[0].chargesCurrent).toBe(7);
    expect(applyQueuedItemCharges(wands, 43, [operation({ kind: "magic-item-charges", persMagicItemId: 7, step: -1 })])).toBe(wands);
  });

  it("підготовка перемикається по spellId, у тому числі через власний читач ключа", () => {
    const rows = [{ spell: { spellId: 5 }, isPrepared: false }, { spell: { spellId: 6 }, isPrepared: true }];
    const prepared = applyQueuedSpellPreparation(
      rows,
      42,
      [operation({ kind: "spell-prepared", spellId: 5, isPrepared: true })],
      (row) => row.spell.spellId,
    );
    expect(prepared.map((row) => row.isPrepared)).toEqual([true, true]);
  });

  it("розпізнає нові види й відкидає їхні зламані форми", () => {
    expect(isOfflineOperation(operation({ kind: "feature-use", featureId: 1, direction: "spend" }))).toBe(true);
    expect(isOfflineOperation(operation({ kind: "feature-use", featureId: 1, direction: "reset" as never }))).toBe(false);
    expect(isOfflineOperation(operation({ kind: "feature-state", featureId: 1, isActive: true }))).toBe(true);
    expect(isOfflineOperation(operation({ kind: "feature-state", featureId: 1, isActive: "yes" as never }))).toBe(false);
    expect(isOfflineOperation(operation({ kind: "concentration", spellId: 5 }))).toBe(true);
    expect(isOfflineOperation(operation({ kind: "concentration", spellId: null }))).toBe(true);
    expect(isOfflineOperation(operation({ kind: "concentration", spellId: "5" as never }))).toBe(false);
    expect(isOfflineOperation(operation({ kind: "spell-buff", effectKey: "HASTE", isActive: true, spellId: null, endsWithConcentration: false }))).toBe(true);
    expect(isOfflineOperation(operation({ kind: "spell-buff", effectKey: "HASTE", isActive: true, spellId: null, endsWithConcentration: "no" as never }))).toBe(false);
    expect(isOfflineOperation(operation({ kind: "exhaustion", level: 2 }))).toBe(true);
    expect(isOfflineOperation(operation({ kind: "exhaustion", level: 1.5 }))).toBe(false);
    expect(isOfflineOperation(operation({ kind: "magic-item-charges", persMagicItemId: 1, step: 1.5 }))).toBe(false);
    expect(isOfflineOperation(operation({ kind: "spell-prepared", spellId: 1, isPrepared: "так" as never }))).toBe(false);
    expect(isOfflineOperation(operation({ kind: "hit-dice", remainingByClass: null as never }))).toBe(false);
    expect(isOfflineOperation(operation({ kind: "restore-pact-slot" }))).toBe(true);
  });
});

describe("Відпочинок у офлайн-черзі — розпізнавання", () => {
  it("приймає довгий і короткий відпочинок з кинутими хітами", () => {
    expect(isOfflineOperation(operation({ kind: "long-rest" }))).toBe(true);
    expect(
      isOfflineOperation(operation({ kind: "short-rest", hitDiceSpent: [{ classId: 3, count: 2 }], restoredHitPoints: 11 })),
    ).toBe(true);
  });

  it("відкидає короткий відпочинок без суми хітів або з кривими кубиками", () => {
    expect(isOfflineOperation({ ...operation({ kind: "long-rest" }), kind: "short-rest", hitDiceSpent: [] })).toBe(false);
    expect(
      isOfflineOperation(operation({ kind: "short-rest", hitDiceSpent: [{ classId: 3, count: -1 }], restoredHitPoints: 1 })),
    ).toBe(false);
    expect(
      isOfflineOperation(operation({ kind: "short-rest", hitDiceSpent: "d8" as never, restoredHitPoints: 1 })),
    ).toBe(false);
  });
});
