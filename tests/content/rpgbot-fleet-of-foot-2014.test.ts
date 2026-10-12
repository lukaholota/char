import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { stripRuleTermAnchors } from "@/lib/term-link";

it("delivers Wood Elf Fleet of Foot itself with the exact PHB walking-speed rule", () => {
  const races = JSON.parse(readFileSync("tests/fixtures/5etools/raw-slices/races.json", "utf8"));
  const wood = races.subrace.find((race: { name: string; source: string; raceName: string }) => race.name === "Wood" && race.source === "PHB" && race.raceName === "Elf");
  expect(wood.page).toBe(24);
  expect(wood.entries.find((entry: { name: string }) => entry.name === "Fleet of Foot").entries).toEqual(["Your base walking speed increases to 35 feet."]);
  const reviewed = JSON.parse(readFileSync("data/rpgbot/feature-descriptions-2014.json", "utf8")).filter((entry: { engName: string }) => entry.engName === "Fleet of Foot");
  expect(reviewed).toHaveLength(1);
  const feature = reviewed[0];
  expect(feature.catalog).toBe("races");
  expect(feature.kind).toBe("feature");
  expect(feature.source).toEqual({ file: "data/5etools/raw/races.json", book: "PHB", page: 24 });
  expect(feature.details).toContainEqual({ label: "Раса", value: "Лісовий ельф — PHB (2014)" });
  expect(stripRuleTermAnchors(feature.description)).toBe("Ваша базова швидкість ходьби збільшується до 35 футів.");
  const delivered = JSON.parse(readFileSync("src/lib/generated/optimization-feature-descriptions-2014.json", "utf8")).filter((entry: { engName: string }) => entry.engName === "Fleet of Foot");
  expect(delivered).toHaveLength(1);
  expect(delivered[0]).toEqual({ name: feature.name, engName: feature.engName, catalog: feature.catalog, kind: feature.kind, description: feature.description, details: [...feature.details, { label: "Джерело", value: "Книга Гравця (2014), с. 24" }] });
});
