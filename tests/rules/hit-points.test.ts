import { describe, expect, it } from "vitest";
import { sumFeatureHitPointsPerLevel, sumLevelUpFeatureHitPoints } from "@/rules/hit-points";

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

describe("sumLevelUpFeatureHitPoints — область фічі", () => {
  const MONK = 10;
  const SORCERER = 20;
  const draconicResilience = { featureId: 5, bonusHitPointsPerLevel: 1, grantingClassIds: [SORCERER] };

  it("фіча виду дає хіт на рівні будь-якого класу", () => {
    expect(
      sumLevelUpFeatureHitPoints({ ownedFeatures: [DWARVEN_TOUGHNESS], gainedFeatures: [], leveledClassId: MONK, classLevelAfter: 4 }),
    ).toBe(1);
  });

  it("Драконяча живучість на 3-му рівні Чародія дає 3 заднім числом", () => {
    expect(
      sumLevelUpFeatureHitPoints({ ownedFeatures: [], gainedFeatures: [draconicResilience], leveledClassId: SORCERER, classLevelAfter: 3 }),
    ).toBe(3);
  });

  it("далі — по 1 за кожен рівень Чародія", () => {
    expect(
      sumLevelUpFeatureHitPoints({ ownedFeatures: [draconicResilience], gainedFeatures: [], leveledClassId: SORCERER, classLevelAfter: 4 }),
    ).toBe(1);
  });

  it("рівень Монаха Драконячої живучості не додає", () => {
    expect(
      sumLevelUpFeatureHitPoints({ ownedFeatures: [draconicResilience, DWARVEN_TOUGHNESS], gainedFeatures: [], leveledClassId: MONK, classLevelAfter: 5 }),
    ).toBe(1);
  });

  it("фіча, яка вже є, заднім числом вдруге не рахується", () => {
    expect(
      sumLevelUpFeatureHitPoints({ ownedFeatures: [draconicResilience], gainedFeatures: [draconicResilience], leveledClassId: SORCERER, classLevelAfter: 5 }),
    ).toBe(1);
  });
});
