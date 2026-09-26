import { readFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase } from "../user-data";
import { BLOOD_HUNTER_CLASS_NAMES } from "../../prisma/seed/bloodHunter";

afterAll(disconnectDatabase);

/// Мисливець за кровʼю — власний носій O45, його звіряє blood-hunter-carrier.
it("KR31.2 — сід переносить усі класові навички 2024 з файла", async () => {
  const source: Array<{ engName: string; skillProficiencies: unknown }> =
    JSON.parse(readFileSync("data/2024/normalized/classes.json", "utf8"));
  const classes = await prisma.class.findMany({
    where: { ruleset: "RULES_2024", name: { notIn: [...BLOOD_HUNTER_CLASS_NAMES] } },
    select: { name: true, skillProficiencies: true },
  });
  const sortByName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
  expect(classes.sort(sortByName)).toEqual(source.map(cls => ({
    name: `${cls.engName.toUpperCase()}_2024`,
    skillProficiencies: cls.skillProficiencies,
  })).sort(sortByName));
});
