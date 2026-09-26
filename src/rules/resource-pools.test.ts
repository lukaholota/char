import { describe, expect, it } from "vitest";
import {
  applyUsesMaximumDelta,
  findPoolProvider,
  findUsesAfterShortRest,
  listFeaturesRegainingOneUseOnShortRest,
  regainsOneUseOnShortRest,
} from "./resource-pools";

const RAGE = "Barbarian: Rage (2024)";

describe("findUsesAfterShortRest", () => {
  it("повертає рівно одне використання носіям правила 2024", () => {
    expect(findUsesAfterShortRest({ engName: RAGE, usesRemaining: 0, maxUses: 4 })).toBe(1);
    expect(findUsesAfterShortRest({ engName: RAGE, usesRemaining: 1, maxUses: 4 })).toBe(2);
  });

  it("не переходить за максимум", () => {
    expect(findUsesAfterShortRest({ engName: RAGE, usesRemaining: 4, maxUses: 4 })).toBe(4);
    expect(findUsesAfterShortRest({ engName: RAGE, usesRemaining: 9, maxUses: 4 })).toBe(4);
  });

  it("нерозтрачену фічу лишає на максимумі", () => {
    expect(findUsesAfterShortRest({ engName: RAGE, usesRemaining: null, maxUses: 3 })).toBe(3);
  });

  it("решту фіч і далі зводить до максимуму", () => {
    expect(findUsesAfterShortRest({ engName: "Monk: Flurry of Blows (2024)", usesRemaining: 0, maxUses: 5 })).toBe(5);
    expect(findUsesAfterShortRest({ engName: "Channel Divinity", usesRemaining: 0, maxUses: 2 })).toBe(2);
    expect(findUsesAfterShortRest({ engName: null, usesRemaining: 0, maxUses: 2 })).toBe(2);
  });

  it("максимум нуль лишає нуль", () => {
    expect(findUsesAfterShortRest({ engName: RAGE, usesRemaining: 0, maxUses: 0 })).toBe(0);
  });
});

describe("regainsOneUseOnShortRest", () => {
  it("накриває всіх носіїв правила і не чіпає їхніх відповідників 2014", () => {
    expect(listFeaturesRegainingOneUseOnShortRest()).toHaveLength(7);
    for (const engName of listFeaturesRegainingOneUseOnShortRest()) {
      expect(regainsOneUseOnShortRest(engName)).toBe(true);
      expect(engName.endsWith("(2024)")).toBe(true);
    }
    expect(regainsOneUseOnShortRest("Channel Divinity (Cleric)")).toBe(false);
    expect(regainsOneUseOnShortRest("Rage")).toBe(false);
  });
});

describe("applyUsesMaximumDelta", () => {
  it("доростає на дельту максимуму, як слоти", () => {
    expect(applyUsesMaximumDelta({ usesRemaining: 0, beforeMaximum: 2, afterMaximum: 3 })).toBe(1);
    expect(applyUsesMaximumDelta({ usesRemaining: 1, beforeMaximum: 2, afterMaximum: 4 })).toBe(3);
  });

  it("не переходить за новий максимум", () => {
    expect(applyUsesMaximumDelta({ usesRemaining: 2, beforeMaximum: 2, afterMaximum: 3 })).toBe(3);
  });

  it("підрізає залишок, коли максимум упав", () => {
    expect(applyUsesMaximumDelta({ usesRemaining: 4, beforeMaximum: 4, afterMaximum: 2 })).toBe(2);
  });

  /// Лють 2014 на 20-му рівні — `{"lvl": 20, "uses": "UNLIMITED"}`, максимум звідти не виймається.
  it("не чіпає рядок, коли максимум невідомий або безлімітний", () => {
    expect(applyUsesMaximumDelta({ usesRemaining: 0, beforeMaximum: 6, afterMaximum: null })).toBeNull();
    expect(applyUsesMaximumDelta({ usesRemaining: 0, beforeMaximum: null, afterMaximum: 6 })).toBeNull();
  });

  it("мовчить, коли міняти нічого", () => {
    expect(applyUsesMaximumDelta({ usesRemaining: 2, beforeMaximum: 3, afterMaximum: 3 })).toBeNull();
    expect(applyUsesMaximumDelta({ usesRemaining: null, beforeMaximum: 2, afterMaximum: 3 })).toBeNull();
  });
});

describe("O45 — Знавець проклять підвищує пул Кривавого наврочення", () => {
  const maledict = { featureId: 10, engName: "Blood Maledict (Blood Hunter)", usesCountSpecial: [{ lvl: 1, uses: 1 }], classFeatures: [{}], subclassFeatures: [] };
  const specialist = { featureId: 20, engName: "Curse Specialist (Order of the Ghostslayer)", usesCountSpecial: [{ lvl: 3, uses: 2 }], classFeatures: [], subclassFeatures: [{}] };

  it("максимум дає риса ордену, а не класова, хоч класова зазвичай перемагає", () => {
    expect(findPoolProvider([maledict, specialist])?.featureId).toBe(20);
    expect(findPoolProvider([maledict, { ...specialist, engName: "Order of the Ghostslayer: Curse Specialist (2024)" }])?.featureId).toBe(20);
  });

  it("без ордену лишається Криваве наврочення", () => {
    expect(findPoolProvider([maledict])?.featureId).toBe(10);
  });
});
