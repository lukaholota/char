import { describe, expect, it } from "vitest";
import { sumFeatureHitPointsPerLevel } from "@/rules/hit-points";
import { findFeatsGrantedByChoiceOptions } from "@/rules/feat-sources";

// KR18.3, друга ітерація: число більше не лежить у таблиці за назвою фічі — воно приїжджає
// з `Feature.bonusHitPointsPerLevel`, тож рушій не знає ні про дворфів, ні про редакції.
describe("sumFeatureHitPointsPerLevel", () => {
  const dwarvenToughness = { featureId: 48537, bonusHitPointsPerLevel: 1 };

  it("дає 1 хіт за рівень за дворфську витривалість", () => {
    expect(sumFeatureHitPointsPerLevel([dwarvenToughness])).toBe(1);
  });

  it("не рахує ту саму фічу двічі", () => {
    expect(sumFeatureHitPointsPerLevel([dwarvenToughness, { ...dwarvenToughness }])).toBe(1);
  });

  it("фіча без бонусу нічого не додає", () => {
    expect(sumFeatureHitPointsPerLevel([{ featureId: 1, bonusHitPointsPerLevel: null }])).toBe(0);
  });

  it("віддає нуль на порожньому переліку", () => {
    expect(sumFeatureHitPointsPerLevel([])).toBe(0);
  });
});

describe("findFeatsGrantedByChoiceOptions", () => {
  const featsGrantingFeatures = [
    { featId: 10, featureIds: [100, 101] },
    { featId: 20, featureIds: [200] },
  ];

  it("віддає рису, чию фічу обрано опцією", () => {
    expect(
      findFeatsGrantedByChoiceOptions({ chosenFeatureIds: [101], featsGrantingFeatures })
    ).toEqual([10]);
  });

  it("не віддає нічого, коли жодну фічу риси не обрано", () => {
    expect(
      findFeatsGrantedByChoiceOptions({ chosenFeatureIds: [999], featsGrantingFeatures })
    ).toEqual([]);
  });

  it("пропускає рису, яку персонаж уже має", () => {
    expect(
      findFeatsGrantedByChoiceOptions({
        chosenFeatureIds: [100, 200],
        featsGrantingFeatures,
        alreadyTakenFeatIds: [10],
      })
    ).toEqual([20]);
  });

  it("не дублює рису, коли обрано дві її фічі", () => {
    expect(
      findFeatsGrantedByChoiceOptions({ chosenFeatureIds: [100, 101], featsGrantingFeatures })
    ).toEqual([10]);
  });
});
