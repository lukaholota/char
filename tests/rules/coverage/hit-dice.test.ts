import { describe, expect, it } from "vitest";
import {
  buildHitDicePools,
  findMainClassLevel,
  findPoolsAfterSetting,
  findPoolsAfterSpending,
  serializeHitDicePools,
  type HitDiceClass,
} from "@/rules/hit-dice";

const FIGHTER: HitDiceClass = { classId: 1, hitDie: 10, classLevel: 5 };
const ROGUE: HitDiceClass = { classId: 2, hitDie: 8, classLevel: 3 };

describe("findMainClassLevel", () => {
  it("віднімає рівні мультикласів від повного рівня", () => {
    expect(findMainClassLevel(8, [{ classLevel: 3 }])).toBe(5);
    expect(findMainClassLevel(8, [{ classLevel: 3 }, { classLevel: 2 }])).toBe(3);
  });

  it("не опускається нижче нуля, якщо мультикласи перекривають рівень", () => {
    expect(findMainClassLevel(2, [{ classLevel: 5 }])).toBe(0);
  });
});

describe("buildHitDicePools", () => {
  it("бере максимум із рівня в класі, коли збереженого значення немає", () => {
    expect(buildHitDicePools([FIGHTER], null)).toEqual([
      { classId: 1, hitDie: 10, max: 5, current: 5 },
    ]);
    expect(buildHitDicePools([FIGHTER], undefined)[0].current).toBe(5);
  });

  it("читає збережений залишок за рядковим ключем, бо це JSON-колонка", () => {
    expect(buildHitDicePools([FIGHTER], { "1": 2 })[0].current).toBe(2);
  });

  it("затискає збережений залишок у межі 0…max і обрізає дріб", () => {
    expect(buildHitDicePools([FIGHTER], { "1": 99 })[0].current).toBe(5);
    expect(buildHitDicePools([FIGHTER], { "1": -3 })[0].current).toBe(0);
    expect(buildHitDicePools([FIGHTER], { "1": 2.9 })[0].current).toBe(2);
  });

  it("падає в нуль на нечисловому значенні замість NaN", () => {
    expect(buildHitDicePools([FIGHTER], { "1": Number.NaN })[0].current).toBe(0);
  });

  it("не пускає відʼємний рівень у максимум", () => {
    expect(buildHitDicePools([{ classId: 9, hitDie: 6, classLevel: -2 }], null)[0].max).toBe(0);
  });
});

describe("findPoolsAfterSpending", () => {
  const pools = buildHitDicePools([FIGHTER, ROGUE], null);

  it("списує кубики й не чіпає вихідний масив", () => {
    const result = findPoolsAfterSpending(pools, [{ classId: 1, count: 2 }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pools[0].current).toBe(3);
    expect(pools[0].current).toBe(5);
  });

  it("списує з кількох класів за один прохід", () => {
    const result = findPoolsAfterSpending(pools, [
      { classId: 1, count: 1 },
      { classId: 2, count: 3 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(serializeHitDicePools(result.pools)).toEqual({ 1: 4, 2: 0 });
  });

  it("відмовляє на невідомому класі", () => {
    const result = findPoolsAfterSpending(pools, [{ classId: 42, count: 1 }]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("42");
  });

  it("відмовляє, коли просять більше, ніж лишилось", () => {
    const result = findPoolsAfterSpending(pools, [{ classId: 2, count: 4 }]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("Недостатньо");
  });

  it("вважає відʼємне списання нулем", () => {
    const result = findPoolsAfterSpending(pools, [{ classId: 1, count: -3 }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pools[0].current).toBe(5);
  });
});

describe("findPoolsAfterSetting", () => {
  const pools = buildHitDicePools([FIGHTER, ROGUE], null);

  it("виставляє залишок і затискає його в межі", () => {
    const result = findPoolsAfterSetting(pools, { 1: 99, 2: -1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(serializeHitDicePools(result.pools)).toEqual({ 1: 5, 2: 0 });
  });

  it("лишає незгаданий клас без змін", () => {
    const result = findPoolsAfterSetting(pools, { 1: 1 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(serializeHitDicePools(result.pools)).toEqual({ 1: 1, 2: 3 });
  });

  it("відмовляє на невідомому класі ще до запису", () => {
    const result = findPoolsAfterSetting(pools, { 42: 1 });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("42");
  });
});
