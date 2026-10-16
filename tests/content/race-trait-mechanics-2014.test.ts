import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import raceGrantedSpells from "../../data/2014/race-granted-spells.json";
import races from "@/lib/generated/races.json";
import { readRaceFeatureSeedInputs } from "../../prisma/seed/raceFeatureSeed";
import { readSubraceFeatureSeedInputs } from "../../prisma/seed/subraceFeatureSeed";

type FeatureLimits = {
  engName?: unknown;
  limitedUsesPer?: unknown;
  usesCount?: unknown;
  usesCountDependsOnProficiencyBonus?: unknown;
};

type GrantEntry = { race: string; subrace: string | null; raceOptionName?: string; spells: { engName: string }[] };
type CatalogRace = { key: string; traits: { engName: string }[]; subraces?: { key: string; traits: { engName: string }[] }[] };

const seedFeatures = [...readRaceFeatureSeedInputs(), ...readSubraceFeatureSeedInputs()];
const creatorContent: unknown = JSON.parse(readFileSync("src/lib/generated/creator-content-2014.json", "utf8"));

function findSeedFeature(engName: string) {
  const feature = seedFeatures.find((input) => input.engName === engName);
  if (!feature) throw new Error(`У сіді немає риси ${engName}`);
  return feature;
}

function collectCatalogFeatures(node: unknown, engName: string, found: FeatureLimits[] = []): FeatureLimits[] {
  if (Array.isArray(node)) {
    for (const item of node) collectCatalogFeatures(item, engName, found);
  } else if (node && typeof node === "object") {
    const record = node as FeatureLimits & Record<string, unknown>;
    if (record.engName === engName && "limitedUsesPer" in record) found.push(record);
    for (const value of Object.values(record)) collectCatalogFeatures(value, engName, found);
  }
  return found;
}

function readSeedSpellNames(engName: string): string[] {
  const connect = findSeedFeature(engName).givesSpells?.connect;
  const targets = Array.isArray(connect) ? connect : connect ? [connect] : [];
  return targets.map((target) => target.engName_ruleset?.engName ?? "").sort();
}

function stripTags(text: unknown): string {
  return String(text ?? "").replace(/<[^>]+>/g, "");
}

describe("лічильники рис рас 2014 відновлюються тим відпочинком, що в книзі", () => {
  it.each(["Stone's Endurance", "Shifting", "Shifting: Beasthide", "Shifting: Longtooth", "Shifting: Swiftstride", "Shifting: Wildhunt"])(
    "%s (MPMM): застосувань стільки, скільки Бонус Майстерності, на тривалий відпочинок",
    (engName) => {
      const seeded = findSeedFeature(engName);
      expect(seeded.limitedUsesPer).toBe("LONG_REST");
      expect(seeded.usesCountDependsOnProficiencyBonus).toBe(true);

      for (const catalogued of collectCatalogFeatures(creatorContent, engName)) {
        expect(catalogued.limitedUsesPer).toBe("LONG_REST");
        expect(catalogued.usesCountDependsOnProficiencyBonus).toBe(true);
      }
    },
  );

  it("каталог конструктора має ці риси Голіафа й Перевертня", () => {
    for (const engName of ["Stone's Endurance", "Shifting: Beasthide", "Shifting: Wildhunt"]) {
      expect(collectCatalogFeatures(creatorContent, engName).length).toBeGreaterThan(0);
    }
  });

  it("Metallic Breath Weapon (FTD): один раз на тривалий відпочинок", () => {
    const seeded = findSeedFeature("Metallic Breath Weapon");
    expect(seeded.limitedUsesPer).toBe("LONG_REST");
    expect(seeded.usesCount).toBe(1);

    const catalogued = collectCatalogFeatures(creatorContent, "Metallic Breath Weapon");
    expect(catalogued.length).toBeGreaterThan(0);
    for (const feature of catalogued) {
      expect(feature.limitedUsesPer).toBe("LONG_REST");
      expect(feature.usesCount).toBe(1);
    }
  });

  it("жодна риса не лічить короткий відпочинок, коли її текст називає лише тривалий, і навпаки", () => {
    const mismatched = seedFeatures
      .filter((input) => input.limitedUsesPer)
      .filter((input) => {
        const text = stripTags(input.description);
        const namesLongRest = /тривал|довг/i.test(text);
        const namesShortRest = /коротк/i.test(text);
        if (input.limitedUsesPer === "SHORT_REST") return namesLongRest && !namesShortRest;
        if (input.limitedUsesPer === "LONG_REST") return namesShortRest && !namesLongRest;
        return false;
      })
      .map((input) => input.engName);

    expect(mismatched).toEqual([]);
  });
});

describe("заклинання, які називає риса раси 2014, — ті самі, що видає раса", () => {
  it.each([
    ["Reach to the Blaze", ["Burning Hands", "Flame Blade", "Produce Flame"]],
    ["Call to the Wave", ["Acid Splash", "Create or Destroy Water", "Water Walk"]],
  ])("%s (MPMM)", (engName, spells) => {
    expect(readSeedSpellNames(engName)).toEqual(spells);
  });

  it("кожна раса з видачею заклинань: givesSpells її рис збігається з data/2014/race-granted-spells.json", () => {
    const mismatches = (raceGrantedSpells.races as GrantEntry[]).flatMap((entry) => {
      const race = (races as CatalogRace[]).find((candidate) => candidate.key === entry.race);
      const traits = entry.subrace
        ? (race?.subraces ?? []).find((subrace) => subrace.key === entry.subrace)?.traits ?? []
        : race?.traits ?? [];
      const seededSpells = [...new Set(traits.flatMap((trait) => readSeedSpellNamesIfSeeded(trait.engName)))].sort();
      const grantedSpells = entry.spells.map((spell) => spell.engName).sort();
      if (seededSpells.length === 0) return [];
      return JSON.stringify(seededSpells) === JSON.stringify(grantedSpells) ? [] : [`${entry.race}: ${seededSpells.join(", ")}`];
    });

    expect(mismatches).toEqual([]);
  });
});

function readSeedSpellNamesIfSeeded(engName: string): string[] {
  return seedFeatures.some((input) => input.engName === engName) ? readSeedSpellNames(engName) : [];
}
