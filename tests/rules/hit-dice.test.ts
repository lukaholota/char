import { describe, expect, it } from "vitest";
import {
  buildHitDicePools,
  findMainClassLevel,
  findPoolsAfterSetting,
  findPoolsAfterSpending,
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
