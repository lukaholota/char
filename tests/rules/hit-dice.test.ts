import { describe, expect, it } from "vitest";
import {
  buildHitDicePools,
  findMainClassLevel,
  findPoolsAfterLongRest,
  findPoolsAfterSetting,
  findPoolsAfterSpending,
  rollHitPointsFromHitDice,
  serializeHitDicePools,
} from "@/rules/hit-dice";

const fighter = { classId: 1, hitDie: 10, classLevel: 5 };
const rogue = { classId: 2, hitDie: 8, classLevel: 3 };

describe("кубики здоровʼя", () => {
  it("рівень основного класу — це рівень мінус мультикласи", () => {
    expect(findMainClassLevel(8, [{ classLevel: 3 }])).toBe(5);
    expect(findMainClassLevel(5, [])).toBe(5);
  });

  it("без збереженого стану пул повний", () => {
    expect(buildHitDicePools([fighter], null)).toEqual([
      { classId: 1, hitDie: 10, max: 5, current: 5 },
    ]);
  });

  it("збережений стан читається за рядковим ключем класу", () => {
    expect(buildHitDicePools([fighter, rogue], { "1": 2 })).toEqual([
      { classId: 1, hitDie: 10, max: 5, current: 2 },
      { classId: 2, hitDie: 8, max: 3, current: 3 },
    ]);
  });

  it("збережене значення понад максимум обрізається", () => {
    expect(buildHitDicePools([fighter], { "1": 99 })[0].current).toBe(5);
  });

  it("витрата зменшує лише вказаний клас", () => {
    const pools = buildHitDicePools([fighter, rogue], null);
    const result = findPoolsAfterSpending(pools, [{ classId: 2, count: 2 }]);
    expect(result).toEqual({
      ok: true,
      pools: [
        { classId: 1, hitDie: 10, max: 5, current: 5 },
        { classId: 2, hitDie: 8, max: 3, current: 1 },
      ],
    });
  });

  it("витрата понад наявне — помилка, пули не змінені", () => {
    const pools = buildHitDicePools([fighter], { "1": 1 });
    const result = findPoolsAfterSpending(pools, [{ classId: 1, count: 2 }]);
    expect(result.ok).toBe(false);
    expect(pools[0].current).toBe(1);
  });

  it("витрата для чужого класу — помилка", () => {
    const result = findPoolsAfterSpending(buildHitDicePools([fighter], null), [{ classId: 42, count: 1 }]);
    expect(result.ok).toBe(false);
  });

  it("ручне виставлення обрізає значення в межі нуль–максимум", () => {
    const pools = buildHitDicePools([fighter, rogue], null);
    const result = findPoolsAfterSetting(pools, { 1: 99, 2: -4 });
    expect(result).toEqual({
      ok: true,
      pools: [
        { classId: 1, hitDie: 10, max: 5, current: 5 },
        { classId: 2, hitDie: 8, max: 3, current: 0 },
      ],
    });
  });

  it("ручне виставлення не чіпає класи, яких немає у запиті", () => {
    const pools = buildHitDicePools([fighter, rogue], { "1": 2, "2": 1 });
    const result = findPoolsAfterSetting(pools, { 2: 3 });
    expect(result.ok && result.pools[0].current).toBe(2);
  });

  it("ручне виставлення для чужого класу — помилка", () => {
    const result = findPoolsAfterSetting(buildHitDicePools([fighter], null), { 42: 1 });
    expect(result.ok).toBe(false);
  });

  it("серіалізація дає числові ключі класів", () => {
    expect(serializeHitDicePools(buildHitDicePools([fighter, rogue], { "1": 2 }))).toEqual({ 1: 2, 2: 3 });
  });
});

describe("довгий відпочинок — кубики здоровʼя", () => {
  const spent = (max: number, current: number, classId = 1) => ({
    classId,
    hitDie: 10,
    max,
    current,
  });

  it("2024 повертає всі витрачені кубики", () => {
    expect(findPoolsAfterLongRest([spent(8, 2)], "RULES_2024")).toEqual([spent(8, 8)]);
  });

  it("2014 повертає половину — приклад із книги: вісім кубиків дають чотири", () => {
    expect(findPoolsAfterLongRest([spent(8, 0)], "RULES_2014")).toEqual([spent(8, 4)]);
  });

  it("2014 не піднімає пул вище максимуму", () => {
    expect(findPoolsAfterLongRest([spent(8, 6)], "RULES_2014")).toEqual([spent(8, 8)]);
  });

  it("2014 повертає щонайменше один кубик навіть на 1 рівні", () => {
    expect(findPoolsAfterLongRest([spent(1, 0)], "RULES_2014")).toEqual([spent(1, 1)]);
  });

  it("2014 рахує половину від суми всіх класів, а не покласово", () => {
    expect(
      findPoolsAfterLongRest([spent(3, 0, 1), spent(2, 0, 2)], "RULES_2014"),
    ).toEqual([spent(3, 2, 1), spent(2, 0, 2)]);
  });

  it("2014 переливає залишок кошика в наступний клас, коли перший уже повний", () => {
    expect(
      findPoolsAfterLongRest([spent(3, 3, 1), spent(2, 0, 2)], "RULES_2014"),
    ).toEqual([spent(3, 3, 1), spent(2, 2, 2)]);
  });
});

describe("кидок кубиків здоровʼя — спільний для сервера й офлайн-листа", () => {
  const pools = [
    { classId: 1, hitDie: 10, max: 3, current: 3 },
    { classId: 2, hitDie: 6, max: 2, current: 2 },
  ];

  it("сумує кубик плюс Статуру за кожен витрачений кубик кожного класу", () => {
    const highest = () => 0.999;
    expect(rollHitPointsFromHitDice(pools, [{ classId: 1, count: 2 }, { classId: 2, count: 1 }], 2, highest)).toBe(12 + 12 + 8);
  });

  it("кожен кубик дає щонайменше один хіт навіть з відʼємною Статурою", () => {
    const lowest = () => 0;
    expect(rollHitPointsFromHitDice(pools, [{ classId: 1, count: 3 }], -3, lowest)).toBe(3);
  });

  it("невідомий клас не кидається", () => {
    expect(rollHitPointsFromHitDice(pools, [{ classId: 99, count: 4 }], 0, () => 0.5)).toBe(0);
  });
});
