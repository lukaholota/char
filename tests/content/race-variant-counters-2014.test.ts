import { describe, expect, it } from "vitest";
import { RestType } from "@prisma/client";
import { readRaceFeatureSeedInputs } from "../../prisma/seed/raceFeatureSeed";
import creatorContent from "../../src/lib/generated/creator-content-2014.json";

function findSeedFeature(engName: string) {
  const feature = readRaceFeatureSeedInputs().find((entry) => entry.engName === engName);
  expect(feature, engName).toBeDefined();
  return feature!;
}

function findCatalogVariant(name: string) {
  const variant = creatorContent.races.flatMap((race) => race.raceVariants).find((entry) => entry.name === name);
  expect(variant, name).toBeDefined();
  return variant!;
}

describe("BUG-035 — Пекельна спадщина (Маммон), MToF с. 21", () => {
  it("Літаючий диск Тензера має власний лічильник короткого відпочинку з 3-го рівня", () => {
    expect(findSeedFeature("Infernal Legacy (Mammon): Tenser's Floating Disk")).toMatchObject({
      limitedUsesPer: RestType.SHORT_REST,
      usesCountSpecial: [{ lvl: 3, uses: 1 }],
    });
  });

  it("Арканний замок має власний лічильник тривалого відпочинку з 5-го рівня", () => {
    expect(findSeedFeature("Infernal Legacy (Mammon): Arcane Lock")).toMatchObject({
      limitedUsesPer: RestType.LONG_REST,
      usesCountSpecial: [{ lvl: 5, uses: 1 }],
    });
  });

  it("описова картка спадщини більше не каже, що все відновлюється тривалим відпочинком", () => {
    expect(findSeedFeature("Infernal Legacy (Mammon)").limitedUsesPer).toBeNull();
    const catalogTrait = findCatalogVariant("TIEFLING_MAMMON").traits.find((trait) => trait.feature.engName === "Infernal Legacy (Mammon)");
    expect(catalogTrait?.feature.limitedUsesPer).toBeNull();
    expect(catalogTrait?.feature.description).toBe(findSeedFeature("Infernal Legacy (Mammon)").description);
  });
});

describe("BUG-037 — Людина (Мітка Переходу), ERLW с. 46", () => {
  it("каталог конструктора дає варіанту швидкість 35 футів", () => {
    expect(findCatalogVariant("HUMAN_MARK_OF_PASSAGE_EBERRON").overridesRaceSpeed).toBe(35);
  });
});
