import { describe, expect, it } from "vitest";
import {
  findHeroicInspirationCountAfterLongRest,
  findHeroicInspirationHintForFacility,
  grantsHeroicInspirationOnLongRest,
  limitHeroicInspirationCount,
  listBastionFacilitiesGrantingHeroicInspiration,
  listFeaturesGrantingHeroicInspirationOnLongRest,
} from "./heroic-inspiration";

const RESOURCEFUL = "Human: Resourceful (2024)";

describe("findHeroicInspirationCountAfterLongRest без стакання", () => {
  const rest = (heroicInspirationCount: number, featureEngNames: (string | null)[]) =>
    findHeroicInspirationCountAfterLongRest({ heroicInspirationCount, canStackHeroicInspiration: false, featureEngNames });

  it("носій риси дістає натхнення після довгого відпочинку", () => {
    expect(rest(0, ["Human: Skillful (2024)", RESOURCEFUL])).toBe(1);
  });

  it("персонаж без носія лишається без натхнення", () => {
    expect(rest(0, ["Orc: Adrenaline Rush (2024)", null])).toBe(0);
    expect(rest(0, [])).toBe(0);
  });

  it("відпочинок не забирає вже наявного натхнення", () => {
    expect(rest(1, [])).toBe(1);
  });

  it("другого натхнення не буває — носій, що вже має, лишається з одним", () => {
    expect(rest(1, [RESOURCEFUL])).toBe(1);
  });
});

describe("findHeroicInspirationCountAfterLongRest зі стаканням", () => {
  const rest = (heroicInspirationCount: number, featureEngNames: string[]) =>
    findHeroicInspirationCountAfterLongRest({ heroicInspirationCount, canStackHeroicInspiration: true, featureEngNames });

  it("носій додає по одному за кожен відпочинок", () => {
    expect(rest(0, [RESOURCEFUL])).toBe(1);
    expect(rest(2, [RESOURCEFUL])).toBe(3);
  });

  it("без носія лічильник не міняється", () => {
    expect(rest(4, [])).toBe(4);
  });
});

describe("limitHeroicInspirationCount", () => {
  it("без стакання тримає 0..1", () => {
    expect(limitHeroicInspirationCount({ heroicInspirationCount: 3, canStackHeroicInspiration: false })).toBe(1);
    expect(limitHeroicInspirationCount({ heroicInspirationCount: -2, canStackHeroicInspiration: false })).toBe(0);
  });

  it("зі стаканням стелі немає, але й мінуса теж", () => {
    expect(limitHeroicInspirationCount({ heroicInspirationCount: 7, canStackHeroicInspiration: true })).toBe(7);
    expect(limitHeroicInspirationCount({ heroicInspirationCount: -1, canStackHeroicInspiration: true })).toBe(0);
    expect(limitHeroicInspirationCount({ heroicInspirationCount: Number.NaN, canStackHeroicInspiration: true })).toBe(0);
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
