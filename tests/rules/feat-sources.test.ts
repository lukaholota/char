import { describe, expect, it } from "vitest";
import { findFeatsGrantedByChoiceOptions } from "@/rules/feat-sources";

const ARCHERY = { featId: 11, featureIds: [101] };
const DEFENSE = { featId: 12, featureIds: [102] };
const TOUGH = { featId: 13, featureIds: [] };

describe("findFeatsGrantedByChoiceOptions", () => {
  it("дає рису, чию фічу приніс вибір класу", () => {
    const granted = findFeatsGrantedByChoiceOptions({
      chosenFeatureIds: [102],
      featsGrantingFeatures: [ARCHERY, DEFENSE, TOUGH],
    });

    expect(granted).toEqual([12]);
  });

  it("не дає нічого, коли вибір не перетинається з фічами рис", () => {
    const granted = findFeatsGrantedByChoiceOptions({
      chosenFeatureIds: [999],
      featsGrantingFeatures: [ARCHERY, DEFENSE, TOUGH],
    });

    expect(granted).toEqual([]);
  });

  it("не повертає рису, яку персонаж уже має", () => {
    const granted = findFeatsGrantedByChoiceOptions({
      chosenFeatureIds: [101, 102],
      featsGrantingFeatures: [ARCHERY, DEFENSE],
      alreadyTakenFeatIds: [11],
    });

    expect(granted).toEqual([12]);
  });

  it("рису з кількома фічами повертає один раз", () => {
    const granted = findFeatsGrantedByChoiceOptions({
      chosenFeatureIds: [101, 103],
      featsGrantingFeatures: [{ featId: 11, featureIds: [101, 103] }],
    });

    expect(granted).toEqual([11]);
  });
});
