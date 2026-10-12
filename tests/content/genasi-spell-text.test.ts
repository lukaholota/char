import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import races from "@/lib/generated/races.json";
import { buildSpellSlug } from "@/lib/spell-link";

const source = JSON.parse(readFileSync("tests/fixtures/5etools/raw-slices/races.json", "utf8"));
const seed = readFileSync("prisma/seed/raceFeatureSeed.ts", "utf8");

describe("тексти чаротворення геназі MPMM відповідають оригіналу", () => {
  it.each([
    ["Air", "Mingle with the Wind"],
    ["Earth", "Merge with Stone"],
    ["Fire", "Reach to the Blaze"],
    ["Water", "Call to the Wave"],
  ])("%s Genasi", (element, featureName) => {
    const originalRace = source.subrace.find((race: { name: string; source: string; raceName: string }) =>
      race.name === element && race.source === "MPMM" && race.raceName === "Genasi"
    );
    const originalFeature = originalRace.entries.find((feature: { name: string }) => feature.name === featureName);
    const expectedSpells = new Set([...originalFeature.entries.join(" ").matchAll(/\{@spell ([^}|]+)/g)]
      .map((match) => buildSpellSlug(match[1])));
    const native = races.flatMap((race) => race.traits).find((feature) => feature.engName === featureName)!;
    const linkedSpells = new Set([...native.description.matchAll(/href="\/spells\/([^"]+)"/g)]
      .map((match) => match[1]));

    expect(linkedSpells).toEqual(expectedSpells);
    expect(native.description).toContain("без матеріального компонента");
    expect(native.description).toContain("Інтелект, Мудрість або Харизма");
    expect(native.description).toContain("тривалого відпочинку");
    expect(seed).toContain(JSON.stringify(native.description).slice(1, -1));
    if (element === "Air") expect(native.description).not.toContain("на себе");
  });
});
