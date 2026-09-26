import { describe, expect, it } from "vitest";

import { getAllClasses } from "@/lib/classesData";
import { getAllRaces } from "@/lib/racesData";
import {
  buildClassReadingHref,
  buildRaceReadingHref,
  findBranchKey,
  findClassReading,
  findFeatureKey,
  findRaceReading,
  findTraitKey,
  parseClassReadingTarget,
  parseRaceReadingTarget,
  writeClassReadingTarget,
  type RaceBranchKind,
} from "@/lib/catalogs/reading-target";

const RULESETS = ["RULES_2014", "RULES_2024"] as const;

function parseHref(href: string): URLSearchParams {
  return new URL(href, "https://char.holota.family").searchParams;
}

function readClassHref(ruleset: (typeof RULESETS)[number], href: string) {
  const target = parseClassReadingTarget(parseHref(href));
  return target ? findClassReading(getAllClasses(ruleset), target) : null;
}

function readRaceHref(ruleset: (typeof RULESETS)[number], href: string) {
  const target = parseRaceReadingTarget(parseHref(href));
  return target ? findRaceReading(getAllRaces(ruleset), target) : null;
}

describe("KR44.2 — кожна ціль каталогу класів знаходиться за своєю адресою", () => {
  for (const ruleset of RULESETS) {
    it(`${ruleset}: клас, підклас і кожна здібність`, () => {
      const misses: string[] = [];

      for (const characterClass of getAllClasses(ruleset)) {
        const classOnly = readClassHref(ruleset, buildClassReadingHref("", { classKey: characterClass.slug, subclassKey: null, featureKey: null }));
        if (classOnly?.characterClass !== characterClass || classOnly.section !== "overview") misses.push(characterClass.slug);

        for (const feature of characterClass.features) {
          const href = buildClassReadingHref("", { classKey: characterClass.slug, subclassKey: null, featureKey: findFeatureKey(feature) });
          const reading = readClassHref(ruleset, href);
          if (reading?.characterClass !== characterClass || reading.missing || reading.section !== "features") misses.push(href);
        }

        for (const subclass of characterClass.subclasses) {
          const subclassHref = buildClassReadingHref("", { classKey: characterClass.slug, subclassKey: subclass.slug, featureKey: null });
          if (readClassHref(ruleset, subclassHref)?.subclass !== subclass) misses.push(subclassHref);

          for (const feature of subclass.features) {
            const href = buildClassReadingHref("", { classKey: characterClass.slug, subclassKey: subclass.slug, featureKey: findFeatureKey(feature) });
            const reading = readClassHref(ruleset, href);
            if (reading?.subclass !== subclass || reading.featureKey !== findFeatureKey(feature)) misses.push(href);
          }
        }
      }

      expect(misses).toEqual([]);
    });
  }

  it("ключі здібностей однозначні в межах власника після нормалізації", () => {
    const collisions = RULESETS.flatMap((ruleset) =>
      getAllClasses(ruleset).flatMap((characterClass) => [
        ...findDuplicates(characterClass.features.map(findFeatureKey)).map((key) => `${characterClass.slug}:${key}`),
        ...findDuplicates(characterClass.subclasses.map((subclass) => subclass.slug)).map((key) => `${characterClass.slug}:${key}`),
        ...characterClass.subclasses.flatMap((subclass) =>
          findDuplicates(subclass.features.map(findFeatureKey)).map((key) => `${characterClass.slug}/${subclass.slug}:${key}`),
        ),
      ]),
    );

    expect(collisions).toEqual([]);
  });
});

describe("KR44.2 — кожна ціль каталогу рас знаходиться за своєю адресою", () => {
  for (const ruleset of RULESETS) {
    it(`${ruleset}: раса, гілка й кожна риса`, () => {
      const misses: string[] = [];

      for (const race of getAllRaces(ruleset)) {
        for (const trait of race.traits) {
          const href = buildRaceReadingHref("", { raceKey: race.slug, branch: null, featureKey: findTraitKey(trait) });
          const reading = readRaceHref(ruleset, href);
          if (reading?.race !== race || reading.missing || reading.section !== "traits") misses.push(href);
        }

        const branches = [
          ...race.subraces.map((entry) => ({ kind: "subrace" as RaceBranchKind, entry })),
          ...race.variants.map((entry) => ({ kind: "variant" as RaceBranchKind, entry })),
        ];
        for (const { kind, entry } of branches) {
          const branch = { kind, key: findBranchKey(entry) };
          const branchHref = buildRaceReadingHref("", { raceKey: race.slug, branch, featureKey: null });
          if (readRaceHref(ruleset, branchHref)?.branch?.entry !== entry) misses.push(branchHref);

          for (const trait of entry.traits) {
            const href = buildRaceReadingHref("", { raceKey: race.slug, branch, featureKey: findTraitKey(trait) });
            const reading = readRaceHref(ruleset, href);
            if (reading?.branch?.entry !== entry || reading.featureKey !== findTraitKey(trait)) misses.push(href);
          }
        }
      }

      expect(misses).toEqual([]);
    });
  }

  it("ключі гілок і рис однозначні в межах власника", () => {
    const collisions = RULESETS.flatMap((ruleset) =>
      getAllRaces(ruleset).flatMap((race) => [
        ...findDuplicates(race.traits.map(findTraitKey)).map((key) => `${race.slug}:${key}`),
        ...findDuplicates(race.subraces.map(findBranchKey)).map((key) => `${race.slug}:subrace:${key}`),
        ...findDuplicates(race.variants.map(findBranchKey)).map((key) => `${race.slug}:variant:${key}`),
        ...[...race.subraces, ...race.variants].flatMap((branch) =>
          findDuplicates(branch.traits.map(findTraitKey)).map((key) => `${race.slug}/${branch.key}:${key}`),
        ),
      ]),
    );

    expect(collisions).toEqual([]);
  });
});

describe("KR44.2 — сумісність і невідомі цілі", () => {
  it("старий `jump=<підклас>` із `q` відкриває підклас", () => {
    const reading = readClassHref("RULES_2014", "/classes?class=bard&q=%D0%9A%D0%BE%D0%BB%D0%B5%D0%B3%D1%96%D1%8F&jump=college-of-lore");

    expect(reading?.subclass?.slug).toBe("college-of-lore");
    expect(reading?.section).toBe("subclasses");
  });

  it("старий `jump=subrace:<KEY>` відкриває гілку раси за ключем бази", () => {
    const reading = readRaceHref("RULES_2014", "/races?race=elf&jump=subrace:ELF_HIGH_2014");

    expect(reading?.branch?.entry.engName).toBe("High Elf");
  });

  it("числовий id батька відкриває того самого батька", () => {
    const bard = getAllClasses("RULES_2014").find((characterClass) => characterClass.slug === "bard")!;
    const elf = getAllRaces("RULES_2014").find((race) => race.slug === "elf")!;

    expect(readClassHref("RULES_2014", `/classes?class=${bard.classId}`)?.characterClass).toBe(bard);
    expect(readRaceHref("RULES_2014", `/races?race=${elf.raceId}`)?.race).toBe(elf);
  });

  it("фільтри й `q` лишаються поруч із ціллю, але її не змінюють", () => {
    const params = new URLSearchParams("q=%D0%B2%D0%BE%D1%97%D0%BD&hd=10&jump=college-of-lore");
    writeClassReadingTarget(params, { classKey: "bard", section: "features", subclassKey: null, featureKey: "bardic-inspiration-1" });

    expect(params.get("q")).toBe("воїн");
    expect(params.get("hd")).toBe("10");
    expect(params.get("jump")).toBeNull();
    expect(readClassHref("RULES_2014", `/classes?${params}`)?.featureKey).toBe("bardic-inspiration-1");
  });

  it("явний розділ без цілі переживає round trip", () => {
    const href = buildClassReadingHref("/2024", { classKey: "bard", section: "subclasses", subclassKey: null, featureKey: null });

    expect(href).toBe("/2024/classes?class=bard&view=subclasses");
    expect(parseClassReadingTarget(parseHref(href))?.section).toBe("subclasses");
  });

  it("невідомий підклас чи здібність не підміняються батьком мовчки", () => {
    expect(readClassHref("RULES_2014", "/classes?class=bard&subclass=college-of-nothing")?.missing).toBe("subclass");
    expect(readClassHref("RULES_2014", "/classes?class=bard&feature=nothing-3")?.missing).toBe("feature");
    expect(readRaceHref("RULES_2014", "/races?race=elf&subrace=moon-elf")?.missing).toBe("branch");
    expect(readClassHref("RULES_2014", "/classes?class=nobody")).toBeNull();
  });

  it("переклад назви чи порядок масиву ключа не змінюють", () => {
    const feature = { name: "Натхнення барда", engName: "Bardic Inspiration", level: 1 };

    expect(findFeatureKey({ ...feature, name: "Бардівське натхнення" })).toBe(findFeatureKey(feature));
    expect(findFeatureKey(feature)).toBe("bardic-inspiration-1");
  });
});

function findDuplicates(keys: string[]): string[] {
  const seen = new Set<string>();
  return keys.filter((key) => (seen.has(key) ? true : (seen.add(key), false)));
}
