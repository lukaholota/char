import { describe, expect, it } from "vitest";
import { findLevelUpHitPointSources } from "@/lib/components/levelUp/levelup-hit-point-sources";

describe("названі джерела приросту HP", () => {
  const dwarf = { featureId: 1, name: "Дворфська витривалість", bonusHitPointsPerLevel: 1 };
  const draconic = { featureId: 2, name: "Драконяча живучість", bonusHitPointsPerLevel: 1, grantingClassIds: [3] };
  it("показує тільки ті джерела, що впливають на вибраний клас, без дублів", () => {
    expect(findLevelUpHitPointSources({ ownedFeatures: [dwarf, draconic], gainedFeatures: [dwarf], leveledClassId: 4, classLevelAfter: 5 }))
      .toEqual([{ name: "Дворфська витривалість", amount: 1 }]);
  });
  it("називає нове класове джерело з його ретроактивним внеском", () => {
    expect(findLevelUpHitPointSources({ ownedFeatures: [], gainedFeatures: [draconic], leveledClassId: 3, classLevelAfter: 3 }))
      .toEqual([{ name: "Драконяча живучість", amount: 3 }]);
  });
});
