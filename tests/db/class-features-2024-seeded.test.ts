/**
 * KR13.2 — бʼє по базі, а не по JSON: класові фічі 2024 мають бути реально засіяні.
 * Вхідний JSON валідує tests/content/class-features-2024.test.ts — це різні перевірки.
 */

import { afterAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";

const CYRILLIC = /\p{Script=Cyrillic}/u;

type ClassJson2024 = {
  engName: string;
  features?: { level: number; name: string }[];
};

const classesFromData: ClassJson2024[] = JSON.parse(
  readFileSync(join(process.cwd(), "data/2024/normalized/classes.json"), "utf-8"),
);

const expectedFeatureCount = classesFromData.reduce(
  (sum, cls) => sum + (cls.features?.length ?? 0),
  0,
);

const expectedLevelsByClass = new Map(
  classesFromData.map((cls) => [
    `${cls.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_2024`,
    [...new Set((cls.features ?? []).map((f) => f.level))].sort((a, b) => a - b),
  ]),
);

afterAll(disconnectDatabase);

describe("класові фічі 2024 у базі", () => {
  it("кожен клас має хоча б одну фічу з непорожнім українським описом", async () => {
    const classes = await prisma.class.findMany({
      where: { ruleset: "RULES_2024" },
      select: {
        name: true,
        features: { select: { feature: { select: { name: true, description: true } } } },
      },
      orderBy: { classId: "asc" },
    });

    expect(classes.length).toBe(classesFromData.length);

    const withoutFeatures = classes.filter((c) => c.features.length === 0).map((c) => c.name);
    expect(withoutFeatures).toEqual([]);

    const withoutUkrainianDescription = classes
      .flatMap((c) => c.features.map((f) => ({ className: c.name, ...f.feature })))
      .filter((f) => !f.description?.trim() || !CYRILLIC.test(f.description))
      .map((f) => `${f.className} / ${f.name}`);
    expect(withoutUkrainianDescription).toEqual([]);
  });

  it("кількість фіч на клас збігається з нормалізованими даними", async () => {
    const total = await prisma.classFeature.count({ where: { ruleset: "RULES_2024" } });
    expect(total).toBe(expectedFeatureCount);
  });

  it("набір рівнів отримання береться з даних, а не з дефолту", async () => {
    const classes = await prisma.class.findMany({
      where: { ruleset: "RULES_2024" },
      select: { name: true, features: { select: { levelGranted: true } } },
    });

    const mismatched = classes
      .map((c) => ({
        className: c.name,
        actual: [...new Set(c.features.map((f) => f.levelGranted))].sort((a, b) => a - b),
        expected: expectedLevelsByClass.get(c.name) ?? [],
      }))
      .filter(({ actual, expected }) => actual.join(",") !== expected.join(","))
      .map(({ className, actual, expected }) => `${className}: ${actual} проти ${expected}`);

    expect(mismatched).toEqual([]);
  });
});
