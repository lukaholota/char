import { afterAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { LEGACY_SUBCLASSES_2024 } from "@/rules/legacy-subclasses-2024";
import subclasses from "../../data/2024/normalized/subclasses.json";
import { disconnectDatabase } from "../user-data";
import { BLOOD_HUNTER_SUBCLASS_NAMES } from "../../prisma/seed/bloodHunter";

afterAll(disconnectDatabase);

const toEnum = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/// Мисливець за кровʼю — власний носій O45, його звіряє blood-hunter-carrier.
it("KR31.2 — усі нормалізовані підкласи 2024 та їхні фічі засіяні", async () => {
  const actual = await prisma.subclass.findMany({
    where: { ruleset: "RULES_2024", name: { notIn: [...BLOOD_HUNTER_SUBCLASS_NAMES] } },
    select: {
      name: true,
      class: { select: { name: true } },
      features: {
        select: { levelGranted: true, ruleset: true, feature: { select: { engName: true, ruleset: true } } },
      },
    },
  });
  expect(actual).toHaveLength(subclasses.length + LEGACY_SUBCLASSES_2024.length);

  for (const source of subclasses) {
    const className = `${source.className.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_2024`;
    const seeded = actual.find(entry => entry.class.name === className && entry.name === toEnum(source.engName));
    expect(seeded, `${source.className}: ${source.engName}`).toBeDefined();
    expect(seeded!.features).toHaveLength(source.features.length);
    const byLevelAndName = (entry: { level: number; engName: string }) => `${entry.level}:${entry.engName}`;
    expect(seeded!.features.map(link => ({ level: link.levelGranted, engName: link.feature.engName })).sort(
      (left, right) => byLevelAndName(left).localeCompare(byLevelAndName(right)),
    )).toEqual(source.featuresEng.map(feature => ({
        level: feature.level,
        engName: `${source.engName}: ${feature.name} (2024)`,
      })).sort((left, right) => byLevelAndName(left).localeCompare(byLevelAndName(right))));
    for (const link of seeded!.features) {
      expect(link.ruleset).toBe("RULES_2024");
      expect(link.feature.ruleset).toBe("RULES_2024");
    }
  }
});
