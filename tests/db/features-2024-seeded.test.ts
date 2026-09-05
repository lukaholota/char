/**
 * KR13.1 — бʼє по базі, а не по JSON: перевіряє, що сід реально застосований.
 * Вхідні дані валідує tests/content/species-traits-2024.test.ts — саме тому діру не помітили.
 */

import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";

const CYRILLIC = /\p{Script=Cyrillic}/u;

afterAll(disconnectDatabase);

describe("расові риси 2024 у базі", () => {
  it("кожен вид має хоча б одну рису з непорожнім українським описом", async () => {
    const species = await prisma.race.findMany({
      where: { ruleset: "RULES_2024" },
      select: { name: true, traits: { select: { feature: { select: { name: true, description: true } } } } },
      orderBy: { raceId: "asc" },
    });

    expect(species.length).toBe(10);

    const withoutTraits = species.filter((s) => s.traits.length === 0).map((s) => s.name);
    expect(withoutTraits).toEqual([]);

    const withoutUkrainianDescription = species
      .flatMap((s) => s.traits.map((t) => ({ species: s.name, ...t.feature })))
      .filter((t) => !t.description?.trim() || !CYRILLIC.test(t.description))
      .map((t) => `${t.species} / ${t.name}`);
    expect(withoutUkrainianDescription).toEqual([]);
  });
});

describe("підкласові фічі 2024 у базі", () => {
  it("кожен підклас має хоча б одну фічу з непорожнім українським описом", async () => {
    const subclasses = await prisma.subclass.findMany({
      where: { ruleset: "RULES_2024" },
      select: {
        name: true,
        features: { select: { levelGranted: true, feature: { select: { name: true, description: true } } } },
      },
      orderBy: { subclassId: "asc" },
    });

    expect(subclasses.length).toBe(48);

    const withoutFeatures = subclasses.filter((s) => s.features.length === 0).map((s) => s.name);
    expect(withoutFeatures).toEqual([]);

    const withoutUkrainianDescription = subclasses
      .flatMap((s) => s.features.map((f) => ({ subclass: s.name, ...f.feature })))
      .filter((f) => !f.description?.trim() || !CYRILLIC.test(f.description))
      .map((f) => `${f.subclass} / ${f.name}`);
    expect(withoutUkrainianDescription).toEqual([]);
  });

  it("рівень отримання фічі береться з даних, а не з дефолту", async () => {
    const levels = await prisma.subclassFeature.findMany({
      where: { ruleset: "RULES_2024" },
      select: { levelGranted: true },
      distinct: ["levelGranted"],
    });

    expect(levels.map((l) => l.levelGranted).sort((a, b) => a - b)).toEqual([
      3, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 20,
    ]);
  });
});
