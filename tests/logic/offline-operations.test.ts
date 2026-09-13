import { describe, expect, it } from "vitest";

import {
  applyOfflineOperation,
  applyQueuedOperations,
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
  currentPactSlots: 1,
  hasHeroicInspiration: false,
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

describe("KR31.3 — Героїчне натхнення в офлайн-черзі", () => {
  it("вмикає й витрачає натхнення як стан, а не лічильник", () => {
    const gained = applyOfflineOperation(BASE, operation({ kind: "heroic-inspiration", hasHeroicInspiration: true }));
    expect(gained.hasHeroicInspiration).toBe(true);

    const spent = applyOfflineOperation(gained, operation({ kind: "heroic-inspiration", hasHeroicInspiration: false }));
    expect(spent.hasHeroicInspiration).toBe(false);
    expect(spent).toMatchObject({ currentHp: 20, tempHp: 5, currentPactSlots: 1 });
  });

  it("приймає лише булеве значення", () => {
    const valid = operation({ kind: "heroic-inspiration", hasHeroicInspiration: true });
    expect(isOfflineOperation(valid)).toBe(true);
    expect(isOfflineOperation({ ...valid, hasHeroicInspiration: 1 })).toBe(false);
    expect(isOfflineOperation({ ...valid, hasHeroicInspiration: undefined })).toBe(false);
  });
});
