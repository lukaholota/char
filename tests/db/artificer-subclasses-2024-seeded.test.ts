import { readFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

it("KR31.2 — усі підкласи Винахідника 2024 та їхні риси доходять до бази", async () => {
  const source: Array<{
    className: string; engName: string; flavorText: string;
    features: Array<{ level: number; name: string; description: string }>;
  }> = JSON.parse(readFileSync("data/2024/normalized/subclasses.json", "utf8"));
  const subclasses = await prisma.subclass.findMany({
    where: { ruleset: "RULES_2024", class: { name: "ARTIFICER_2024" } },
    include: { features: { include: { feature: true } } },
  });
  const sortByName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  expect(subclasses.map(subclass => ({
    name: subclass.name,
    description: subclass.description,
    features: subclass.features.map(grant => ({
      level: grant.levelGranted, name: grant.feature.name, description: grant.feature.description,
    })).sort(sortByName),
  })).sort(sortByName)).toEqual(source.filter(subclass => subclass.className === "Artificer").map(subclass => ({
    name: subclass.engName.toUpperCase().replaceAll(" ", "_"),
    description: subclass.flavorText,
    features: [...subclass.features].sort(sortByName),
  })).sort(sortByName));
});
