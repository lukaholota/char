import { describe, expect, it } from "vitest";
import { sumFeatureHitPointsPerLevel } from "@/rules/hit-points";

const DWARVEN_TOUGHNESS = { featureId: 1, bonusHitPointsPerLevel: 1 };
const DARKVISION = { featureId: 2, bonusHitPointsPerLevel: null };

describe("sumFeatureHitPointsPerLevel", () => {
  it("складає бонуси різних фіч", () => {
    expect(sumFeatureHitPointsPerLevel([DWARVEN_TOUGHNESS, { featureId: 3, bonusHitPointsPerLevel: 2 }])).toBe(3);
  });

  it("фіча без бонусу нічого не додає", () => {
    expect(sumFeatureHitPointsPerLevel([DARKVISION])).toBe(0);
  });

  it("та сама фіча двічі рахується один раз", () => {
    expect(sumFeatureHitPointsPerLevel([DWARVEN_TOUGHNESS, { ...DWARVEN_TOUGHNESS }])).toBe(1);
  });

  it("порожній список дає нуль", () => {
    expect(sumFeatureHitPointsPerLevel([])).toBe(0);
  });

  it("відʼємне або нечислове значення ігнорується, а не віднімає хіти", () => {
    expect(sumFeatureHitPointsPerLevel([{ featureId: 4, bonusHitPointsPerLevel: -3 }])).toBe(0);
  });
});
