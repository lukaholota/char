import { describe, expect, it } from "vitest";
import {
  buildCharacterLevels,
  characterLevelOnly,
  findClassLevel,
  hasCharacterLevelAtLeast,
  hasClassLevelAtLeast,
} from "@/rules/character-level";
import { findEarnedSpeciesFeatureIds, findMissingSpeciesTraits } from "@/rules/species-grants";

/**
 * Референс §4 вимагає саме двох предикатів, а не одного «рівень ≥ N»: Wizard 2 / Fighter 3 —
 * персонаж 5-го рівня, який ще не має підкласу чарівника, але вже літає драконом.
 */
const WIZARD_TWO_FIGHTER_THREE = buildCharacterLevels({
  characterLevel: 5,
  mainClassName: "WIZARD_2024",
  multiclasses: [{ className: "FIGHTER_2024", classLevel: 3 }],
});

describe("KR18.5 — рівень персонажа проти рівня класу", () => {
  it("рівень основного класу виводиться відніманням рівнів мультикласів", () => {
    expect(WIZARD_TWO_FIGHTER_THREE.classLevels).toEqual([
      { className: "WIZARD_2024", classLevel: 2 },
      { className: "FIGHTER_2024", classLevel: 3 },
    ]);
  });

  it("Драконячий політ важить рівень персонажа: 5 є, хоч жоден клас до 5-го не доріс", () => {
    expect(hasCharacterLevelAtLeast(WIZARD_TWO_FIGHTER_THREE, 5)).toBe(true);
    expect(hasClassLevelAtLeast(WIZARD_TWO_FIGHTER_THREE, "WIZARD_2024", 5)).toBe(false);
    expect(hasClassLevelAtLeast(WIZARD_TWO_FIGHTER_THREE, "FIGHTER_2024", 5)).toBe(false);
  });

  it("підклас важить рівень класу: воїн на 3-му має, чарівник на 2-му ні", () => {
    expect(hasClassLevelAtLeast(WIZARD_TWO_FIGHTER_THREE, "FIGHTER_2024", 3)).toBe(true);
    expect(hasClassLevelAtLeast(WIZARD_TWO_FIGHTER_THREE, "WIZARD_2024", 3)).toBe(false);
  });

  it("клас, якого персонаж не має, стоїть на нулі, а не падає", () => {
    expect(findClassLevel(WIZARD_TWO_FIGHTER_THREE, "BARD_2024")).toBe(0);
    expect(hasClassLevelAtLeast(WIZARD_TWO_FIGHTER_THREE, "BARD_2024", 1)).toBe(false);
  });

  it("питання лише про рівень персонажа не бреше про класи: жоден клас не має рівня", () => {
    const speciesOnly = characterLevelOnly(5);

    expect(hasCharacterLevelAtLeast(speciesOnly, 5)).toBe(true);
    expect(hasClassLevelAtLeast(speciesOnly, "FIGHTER_2024", 1)).toBe(false);
  });

  it("персонаж без мультикласу віддає весь свій рівень основному класу", () => {
    const single = buildCharacterLevels({ characterLevel: 7, mainClassName: "CLERIC", multiclasses: [] });

    expect(findClassLevel(single, "CLERIC")).toBe(7);
  });
});

describe("KR18.5 — риси виду за рівнем персонажа", () => {
  const DRACONIC_ANCESTRY = { featureId: 11, level: 1 };
  const DRACONIC_FLIGHT = { featureId: 22, level: 5 };
  const CELESTIAL_REVELATION = { featureId: 33, level: 3 };
  const traits = [DRACONIC_ANCESTRY, DRACONIC_FLIGHT, CELESTIAL_REVELATION];

  const atLevel = (characterLevel: number) => characterLevelOnly(characterLevel);
  const missingIds = (levels: ReturnType<typeof atLevel>, owned: number[]) =>
    findMissingSpeciesTraits(traits, levels, owned).map((trait) => trait.featureId);

  it("на 1-му рівні видно лише риси 1-го рівня", () => {
    expect(findEarnedSpeciesFeatureIds(traits, atLevel(1))).toEqual([11]);
  });

  it("на 3-му відкривається Прояв, на 5-му — Політ", () => {
    expect(findEarnedSpeciesFeatureIds(traits, atLevel(3))).toEqual([11, 33]);
    expect(findEarnedSpeciesFeatureIds(traits, atLevel(5))).toEqual([11, 22, 33]);
  });

  it("мультиклас нічого не змінює — важить лише сума рівнів", () => {
    expect(findEarnedSpeciesFeatureIds(traits, WIZARD_TWO_FIGHTER_THREE)).toEqual([11, 22, 33]);
  });

  it("вже видане не видається вдруге, а пропущене добирається", () => {
    expect(missingIds(atLevel(5), [11, 22, 33])).toEqual([]);
    // Персонаж 2024, створений до KR18.5: на 5-му рівні має лише рису 1-го рівня.
    expect(missingIds(atLevel(5), [11])).toEqual([22, 33]);
  });

  it("правила 2014 не рухаються: усе, що без рівня, це рівень 1", () => {
    const legacyTraits = [{ featureId: 1, level: 1 }, { featureId: 2, level: 1 }];

    expect(findEarnedSpeciesFeatureIds(legacyTraits, atLevel(1))).toEqual([1, 2]);
    expect(findEarnedSpeciesFeatureIds(legacyTraits, atLevel(20))).toEqual([1, 2]);
  });
});
