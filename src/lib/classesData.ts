/**
 * Static class data for the catalogs.
 *
 * Reads `src/lib/generated/classes.json`, built from the same `class` / `subclass` tables the
 * character creator queries — no second source of truth (KR15.6).
 */

import type { Ruleset, Skills } from "@prisma/client";

import classesJson from "@/lib/generated/classes.json";
import { getClassImagePath } from "@/lib/assets/image-manifest";
import { toEntitySlug } from "@/lib/slug-utils";

export type ClassFeature = {
  level: number;
  name: string;
  engName: string;
  description: string;
};

export type SubclassData = {
  subclassId: number;
  key: string;
  slug: string;
  name: string;
  engName: string;
  description: string | null;
  source?: string | null;
  legacy?: boolean;
  features: ClassFeature[];
};

export type ClassData = {
  classId: number;
  key: string;
  slug: string;
  name: string;
  engName: string;
  description: string | null;
  hitDie: number;
  savingThrows: string[];
  armorProficiencies: string[];
  toolProficiencies: string[];
  skillChoices: { options: Skills[]; count: number };
  spellcasting: string | null;
  castingStat: string | null;
  subclassLevel: number;
  abilityScoreUpLevels: number[];
  features: ClassFeature[];
  subclasses: SubclassData[];
  imageSrc: string | null;
  source: string;
  ruleset: Ruleset;
};

type RawSubclass = Omit<SubclassData, "slug">;
type RawClass = Omit<ClassData, "slug" | "imageSrc" | "subclasses" | "source"> & { subclasses: RawSubclass[] };

/// Таблиця `class` не має стовпця з джерелом: усі класи — з Книги Гравця своєї редакції, крім
/// Винахідника (Казан Таші 2014; Горнило Винахідника 2024).
function findClassSource(key: string, ruleset: Ruleset): string {
  const isArtificer = key.startsWith("ARTIFICER");
  if (ruleset === "RULES_2024") return isArtificer ? "EFA" : "PHB_2024";
  return isArtificer ? "TCOE" : "PHB";
}

const ALL_CLASSES: ClassData[] = (classesJson as RawClass[]).map((characterClass) => ({
  ...characterClass,
  slug: toEntitySlug(characterClass.engName),
  imageSrc: getClassImagePath(characterClass.key),
  source: findClassSource(characterClass.key, characterClass.ruleset),
  subclasses: characterClass.subclasses.map((subclass) => ({
    ...subclass,
    slug: toEntitySlug(subclass.engName),
  })),
}));

export function getAllClasses(ruleset: Ruleset): ClassData[] {
  return ALL_CLASSES.filter((characterClass) => characterClass.ruleset === ruleset);
}

export function findClassBySlug(slug: string, ruleset: Ruleset): ClassData | null {
  return getAllClasses(ruleset).find((characterClass) => characterClass.slug === slug) ?? null;
}
