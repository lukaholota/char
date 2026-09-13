import { describe, expect, it } from "vitest";
import {
  findInfusionPicksAtLevel,
  findInfusionsKnownAtLevel,
  isInfusionLevel,
} from "./artificer-infusions";

describe("вливання артифайсера", () => {
  it("до 2 рівня класу вливань немає", () => {
    expect(findInfusionsKnownAtLevel(1)).toBe(0);
    expect(isInfusionLevel(1)).toBe(false);
  });

  it("таблиця знаних росте на 2 / 6 / 10 / 14 / 18", () => {
    expect(findInfusionsKnownAtLevel(2)).toBe(4);
    expect(findInfusionsKnownAtLevel(6)).toBe(6);
    expect(findInfusionsKnownAtLevel(10)).toBe(8);
    expect(findInfusionsKnownAtLevel(14)).toBe(10);
    expect(findInfusionsKnownAtLevel(18)).toBe(12);
  });

  it("між сходинками число не змінюється", () => {
    expect(findInfusionsKnownAtLevel(5)).toBe(4);
    expect(findInfusionsKnownAtLevel(9)).toBe(6);
    expect(findInfusionsKnownAtLevel(20)).toBe(12);
  });

  it("на 2 рівні обирають чотири, далі — по два", () => {
    expect(findInfusionPicksAtLevel(2)).toBe(4);
    for (const level of [6, 10, 14, 18]) {
      expect(findInfusionPicksAtLevel(level)).toBe(2);
    }
  });

  it("на рівнях поза таблицею вибору немає", () => {
    for (const level of [1, 3, 5, 7, 11, 15, 19, 20]) {
      expect(findInfusionPicksAtLevel(level)).toBe(0);
      expect(isInfusionLevel(level)).toBe(false);
    }
  });

  it("рівні вибору — рівно ті пʼять, на які база тримає вливання", () => {
    const levels = Array.from({ length: 20 }, (_, index) => index + 1).filter(isInfusionLevel);

    expect(levels).toEqual([2, 6, 10, 14, 18]);
  });
});
