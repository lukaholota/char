import { readFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

const toEnumName = (engName: string) => `${engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_2024`;
const byName = (left: { name: string }, right: { name: string }) => left.name.localeCompare(right.name);

it("KR33.4 — сід переносить прозу 13 класів 2024 з файла", async () => {
  const source: Array<{ engName: string; flavorText: string }> =
    JSON.parse(readFileSync("data/2024/normalized/classes.json", "utf8"));
  const classes = await prisma.class.findMany({ where: { ruleset: "RULES_2024" }, select: { name: true, description: true } });

  expect(classes.sort(byName)).toEqual(
    source.map((entry) => ({ name: toEnumName(entry.engName), description: entry.flavorText })).sort(byName),
  );
});

it("KR33.4 — сід переносить опис 10 видів 2024 з файла", async () => {
  const source: Array<{ engName: string; description: string }> =
    JSON.parse(readFileSync("data/2024/normalized/species.json", "utf8"));
  const races = await prisma.race.findMany({ where: { ruleset: "RULES_2024" }, select: { name: true, description: true } });

  expect(races.sort(byName)).toEqual(
    source.map((entry) => ({ name: toEnumName(entry.engName), description: entry.description })).sort(byName),
  );
});

it("KR33.4 — «Почварна спадщина» тифлінга лишилася однією групою з трьох варіантів", async () => {
  const groups = await prisma.raceChoiceOption.groupBy({
    by: ["choiceGroupName"],
    where: { ruleset: "RULES_2024", race: { name: "TIEFLING_2024" } },
    _count: true,
  });

  expect(groups.map((group) => [group.choiceGroupName, group._count]).sort()).toEqual(
    [["Базова характеристика заклинань", 3], ["Почварна спадщина", 3]].sort(),
  );
});

it("KR33.4 — риса й фічі варіантів тифлінга звуться «Почварна спадщина»", async () => {
  const features = await prisma.feature.findMany({
    where: { engName: { contains: "Fiendish Legacy" } },
    select: { name: true },
  });

  expect(features.map((feature) => feature.name).sort()).toEqual([
    "Почварна спадщина",
    "Почварна спадщина (Безодня)",
    "Почварна спадщина (Пекельна)",
    "Почварна спадщина (Хтонічна)",
  ]);
});
