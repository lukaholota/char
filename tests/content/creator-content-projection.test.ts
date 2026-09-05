import { describe, expect, it } from "vitest";

import {
  findCharacterCreationOptions,
  findCharacterCreatorOptions,
} from "@/lib/content/creator-content";

describe("KR22.6 — граф створення першого рівня", () => {
  it.each(["RULES_2014", "RULES_2024"] as const)(
    "%s не віддає недосяжні на першому рівні риси",
    (ruleset) => {
      const full = findCharacterCreatorOptions(ruleset);
      const projected = findCharacterCreationOptions(ruleset);

      expect(projected.classes.flatMap((entry) => entry.features).every((entry) => entry.levelGranted <= 1)).toBe(true);
      expect(
        projected.classes
          .flatMap((entry) => entry.subclasses)
          .flatMap((entry) => entry.features)
          .every((entry) => entry.levelGranted <= 1),
      ).toBe(true);
      expect(
        projected.classes.flatMap((entry) => entry.features.map((feature) => feature.classFeatureId)),
      ).toEqual(
        full.classes
          .flatMap((entry) => entry.features)
          .filter((entry) => entry.levelGranted <= 1)
          .map((entry) => entry.classFeatureId),
      );
      expect(
        projected.classes
          .flatMap((entry) => entry.subclasses)
          .flatMap((entry) => entry.features)
          .map((feature) => feature.subclassFeatureId),
      ).toEqual(
        full.classes
          .flatMap((entry) => entry.subclasses)
          .flatMap((entry) => entry.features)
          .filter((entry) => entry.levelGranted <= 1)
          .map((entry) => entry.subclassFeatureId),
      );
      expect(
        projected.classes
          .flatMap((entry) => entry.classOptionalFeatures)
          .every((entry) => entry.grantedOnLevels.includes(1)),
      ).toBe(true);
    },
  );

  it("не зрізає повний граф, який читає levelup", () => {
    const full = findCharacterCreatorOptions("RULES_2014");
    const projected = findCharacterCreationOptions("RULES_2014");

    expect(full.classes.flatMap((entry) => entry.features).some((entry) => entry.levelGranted > 1)).toBe(true);
    expect(
      full.classes
        .flatMap((entry) => entry.subclasses)
        .flatMap((entry) => entry.features)
        .some((entry) => entry.levelGranted > 1),
    ).toBe(true);
    expect(JSON.stringify(projected).length).toBeLessThan(JSON.stringify(full).length * 0.65);
  });
});
