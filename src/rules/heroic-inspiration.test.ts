import { describe, expect, it } from "vitest";
import {
  findHeroicInspirationAfterLongRest,
  findHeroicInspirationHintForFacility,
  grantsHeroicInspirationOnLongRest,
  listBastionFacilitiesGrantingHeroicInspiration,
  listFeaturesGrantingHeroicInspirationOnLongRest,
} from "./heroic-inspiration";

const RESOURCEFUL = "Human: Resourceful (2024)";

describe("findHeroicInspirationAfterLongRest", () => {
  it("носій риси дістає натхнення після довгого відпочинку", () => {
    expect(
      findHeroicInspirationAfterLongRest({ hasHeroicInspiration: false, featureEngNames: ["Human: Skillful (2024)", RESOURCEFUL] }),
    ).toBe(true);
  });

  it("персонаж без носія лишається без натхнення", () => {
    expect(
      findHeroicInspirationAfterLongRest({ hasHeroicInspiration: false, featureEngNames: ["Orc: Adrenaline Rush (2024)", null] }),
    ).toBe(false);
    expect(findHeroicInspirationAfterLongRest({ hasHeroicInspiration: false, featureEngNames: [] })).toBe(false);
  });

  it("відпочинок не забирає вже наявного натхнення", () => {
    expect(findHeroicInspirationAfterLongRest({ hasHeroicInspiration: true, featureEngNames: [] })).toBe(true);
  });

  it("другого натхнення не буває — носій, що вже має, лишається з одним", () => {
    expect(findHeroicInspirationAfterLongRest({ hasHeroicInspiration: true, featureEngNames: [RESOURCEFUL] })).toBe(true);
  });
});

describe("реєстр носіїв", () => {
  it("знає Винахідливість Людини 2024 і нікого більше", () => {
    expect(grantsHeroicInspirationOnLongRest(RESOURCEFUL)).toBe(true);
    expect(grantsHeroicInspirationOnLongRest("Human: Resourceful")).toBe(false);
    expect(grantsHeroicInspirationOnLongRest(null)).toBe(false);
    expect(listFeaturesGrantingHeroicInspirationOnLongRest()).toEqual([RESOURCEFUL]);
  });
});

describe("підказки приміщень бастіону", () => {
  it("три приміщення DMG 2024 мають підказку, решта — ні", () => {
    expect(listBastionFacilitiesGrantingHeroicInspiration().sort()).toEqual([
      "lords-alliance-noble-residence",
      "seance-parlor",
      "workshop",
    ]);
    expect(findHeroicInspirationHintForFacility("workshop")).toMatch(/Героїчне натхнення/);
    expect(findHeroicInspirationHintForFacility("arcane-study")).toBeNull();
  });
});
