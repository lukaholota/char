import { describe, expect, it } from "vitest";

import { getAllClasses } from "@/lib/classesData";
import { getAllRaces } from "@/lib/racesData";
import { buildOmniSearchIndex, searchOmniIndex, type OmniSearchItem } from "@/lib/omniSearchData";
import {
  findClassReading,
  findRaceReading,
  parseClassReadingTarget,
  parseRaceReadingTarget,
} from "@/lib/catalogs/reading-target";
import { findClassMatches, findRaceMatches } from "@/lib/catalogs/reading-matches";

const RULESETS = ["RULES_2014", "RULES_2024"] as const;

function parseHref(href: string): URLSearchParams {
  return new URL(href, "https://char.holota.family").searchParams;
}

function findFirstClassesItem(query: string, ruleset: (typeof RULESETS)[number]): OmniSearchItem | undefined {
  return searchOmniIndex(query, ruleset, "classes")[0];
}

describe("KR44.4 — пошук знаходить здібність у її класі й підкласі", () => {
  it("«Ріжучі слова» і «Cutting Words» ведуть до здібності Колегії знань 2014", () => {
    for (const query of ["Ріжучі слова", "Cutting Words"]) {
      const [first] = searchOmniIndex(query, "RULES_2014");

      expect(first?.title, query).toBe("Ріжучі слова");
      expect(first?.subtitle, query).toBe("Бард → Колегія знань · 3 рівень");
      expect(first?.href, query).toBe("/classes?class=bard&subclass=college-of-lore&feature=cutting-words-3");
    }
  });

  it("«Натхнення барда» віддає класову здібність 1 рівня в обох редакціях", () => {
    for (const ruleset of RULESETS) {
      const bardicInspiration = searchOmniIndex("Натхнення барда", ruleset).find((item) =>
        item.href.endsWith("class=bard&feature=bardic-inspiration-1"),
      );

      expect(bardicInspiration?.subtitle, ruleset).toBe("Бард · 1 рівень");
      expect(bardicInspiration?.href.startsWith(ruleset === "RULES_2024" ? "/2024/classes" : "/classes"), ruleset).toBe(true);
    }
  });

  it("підраса й риса гілки знаходяться українською й англійською", () => {
    const expected = "/races?race=elf&subrace=high-elf";

    expect(searchOmniIndex("Високий ельф", "RULES_2014")[0]?.href).toBe(expected);
    expect(searchOmniIndex("High Elf", "RULES_2014")[0]?.href).toBe(expected);
    expect(searchOmniIndex("High Elf Cantrip", "RULES_2014")[0]?.href).toBe(`${expected}&feature=high-elf-cantrip`);
    expect(searchOmniIndex("Замовляння вищого ельфа", "RULES_2014")[0]?.href).toBe(`${expected}&feature=high-elf-cantrip`);
  });

  it("однойменні здібності різних класів — окремі рядки з різним контекстом", () => {
    const extraAttacks = searchOmniIndex("Extra Attack", "RULES_2014", "classes").filter((item) => item.badge === "Здібність");

    expect(extraAttacks.length).toBeGreaterThan(3);
    expect(new Set(extraAttacks.map((item) => item.subtitle)).size).toBe(extraAttacks.length);
    expect(new Set(extraAttacks.map((item) => item.href)).size).toBe(extraAttacks.length);
  });
});

describe("KR44.4 — кожен запис класів і рас у пошуку відкриває свого власника", () => {
  for (const ruleset of RULESETS) {
    it(`${ruleset}: адреса знаходить той самий клас, підклас, гілку й здібність`, () => {
      const classes = getAllClasses(ruleset);
      const races = getAllRaces(ruleset);
      const misses: string[] = [];

      for (const item of buildOmniSearchIndex(ruleset)) {
        if (item.id.startsWith("category-")) continue;
        const params = parseHref(item.href);
        if (item.category === "classes") {
          const target = parseClassReadingTarget(params);
          const reading = target ? findClassReading(classes, target) : null;
          if (!reading || reading.missing) misses.push(`${item.id} → ${item.href}`);
          else if (item.badge === "Здібність" && (!reading.featureKey || !item.title)) misses.push(item.id);
        }
        if (item.category === "races") {
          const target = parseRaceReadingTarget(params);
          const reading = target ? findRaceReading(races, target) : null;
          if (!reading || reading.missing) misses.push(`${item.id} → ${item.href}`);
        }
      }

      expect(misses).toEqual([]);
    });

    it(`${ruleset}: id записів індексу унікальні`, () => {
      const ids = buildOmniSearchIndex(ruleset).map((item) => item.id);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

      expect(duplicates).toEqual([]);
    });

    it(`${ruleset}: точна назва класу чи підкласу лишається першим збігом у класах`, () => {
      const displaced: string[] = [];
      for (const characterClass of getAllClasses(ruleset)) {
        if (findFirstClassesItem(characterClass.name, ruleset)?.id !== `class-${characterClass.key}`) {
          displaced.push(characterClass.name);
        }
        for (const subclass of characterClass.subclasses.filter((candidate) => !candidate.legacy)) {
          const first = findFirstClassesItem(subclass.name, ruleset);
          if (first?.title !== subclass.name || first.badge !== "Підклас") displaced.push(`${characterClass.name} → ${subclass.name}: ${first?.title}`);
        }
      }

      expect(displaced).toEqual([]);
    });
  }
});

describe("KR44.4 — пошук усередині каталогу називає точні збіги", () => {
  it("здібність підкласу знаходиться й веде до себе, а не лише до класу", () => {
    const bard = getAllClasses("RULES_2014").find((characterClass) => characterClass.slug === "bard")!;

    expect(findClassMatches(bard, "ріжучі")).toEqual([
      {
        key: "subclass:college-of-lore:cutting-words-3",
        label: "Ріжучі слова",
        context: "Колегія знань · 3 рівень",
        target: { classKey: "bard", section: "subclasses", subclassKey: "college-of-lore", featureKey: "cutting-words-3" },
      },
    ]);
  });

  it("легасі-підклас 2024 знаходиться пошуком каталогу (Р52)", () => {
    const withLegacy = getAllClasses("RULES_2024").filter((characterClass) => characterClass.subclasses.some((subclass) => subclass.legacy));
    const legacy = withLegacy[0].subclasses.find((subclass) => subclass.legacy)!;

    expect(findClassMatches(withLegacy[0], legacy.name).map((match) => match.target.subclassKey)).toContain(legacy.slug);
  });

  it("підраса й її риса знаходяться англійською", () => {
    const elf = getAllRaces("RULES_2014").find((race) => race.slug === "elf")!;

    expect(findRaceMatches(elf, "high elf").map((match) => match.key)).toEqual([
      "subrace:ELF_HIGH_2014",
      "subrace:ELF_HIGH_2014:high-elf-cantrip",
    ]);
  });
});
