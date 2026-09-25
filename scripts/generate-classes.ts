/**
 * Generate static classes.json from the database — both rulesets in one file.
 * Run: npm run generate:classes
 *
 * Same reasoning as races.json: `class`, `subclass` and their features hold 2014 and 2024 side by
 * side, so the catalog can read the one layer the character creator reads.
 */

import { PrismaClient, Skills, type Ruleset } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";

import {
  abilityTranslations,
  armorTypeTranslations,
  classTranslations,
  classTranslationsEng,
  spellcastingTypeTranslations,
  subclassTranslations,
  subclassTranslationsEng,
  toolTranslations,
} from "../src/lib/refs/translation";
import { failOnShrunkCatalog } from "./lib/fail-on-shrunk-catalog";
import { normalizeSkillProficiencies } from "../src/rules/proficiency";
import { findLegacySubclass2024, isLegacySubclass2024 } from "../src/rules/legacy-subclasses-2024";
import subclasses2024 from "../data/2024/normalized/subclasses.json";

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/classes.json");

/// Виміряно 2026-08-28: 26 класів обох редакцій. Порогу тут не було, а каталог обслуговує
/// і сторінки класів, і крок вибору класу в майстрі.
export const MINIMUM_EXPECTED_CLASSES = 26;

const ALL_SKILLS = Object.values(Skills);

export type GeneratedClassFeature = {
  level: number;
  name: string;
  engName: string;
  description: string;
};

export type GeneratedSubclass = {
  subclassId: number;
  key: string;
  name: string;
  engName: string;
  description: string | null;
  source: string | null;
  legacy: boolean;
  features: GeneratedClassFeature[];
};

export type GeneratedClass = {
  classId: number;
  key: string;
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
  features: GeneratedClassFeature[];
  subclasses: GeneratedSubclass[];
  ruleset: Ruleset;
};

const UA: Record<string, string> = classTranslations;
const ENG: Record<string, string> = classTranslationsEng;
const SUBCLASS_UA: Record<string, string> = subclassTranslations;
const SUBCLASS_ENG: Record<string, string> = subclassTranslationsEng;

export function findSubclassSource(classKey: string, subclassKey: string, ruleset: Ruleset): string | null {
  if (ruleset !== "RULES_2024") return null;
  const legacy = findLegacySubclass2024(classKey, subclassKey);
  if (legacy) return legacy.source;
  const subclass = subclasses2024.find(entry =>
    `${entry.className.toUpperCase()}_2024` === classKey &&
    entry.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") === subclassKey,
  );
  if (!subclass) throw new Error(`No source for 2024 subclass ${classKey}/${subclassKey}`);
  return subclass.source;
}

/// The column holds either a plain list or an `{ options, choiceCount }` pick. Keys stay as
/// `Skills` enum values so the card can tell a full list from a narrowed one (KR33.1).
function readSkillChoices(raw: unknown): { options: Skills[]; count: number } {
  const normalized = normalizeSkillProficiencies(raw, ALL_SKILLS);
  if (!normalized) return { options: [], count: 0 };
  if (normalized.type === "fixed") return { options: normalized.skills, count: normalized.skills.length };
  return { options: normalized.options, count: normalized.choiceCount };
}

/// The `Subclasses` enum has one value per subclass, and both editions' rows reuse it — the row's
/// `ruleset` is what separates them. The translation tables key the 2024 reading with a `_2024`
/// suffix, so a 2024 row looks there first and falls back to the shared name.
function findSubclassName(
  table: Record<string, string>,
  key: string,
  ruleset: Ruleset,
): string {
  if (ruleset === "RULES_2024") {
    return table[`${key}_2024`] ?? table[key] ?? key;
  }
  return table[key] ?? key;
}

type FeatureRow = {
  levelGranted: number;
  feature: { name: string; engName: string; description: string };
};

function collectFeatures(rows: FeatureRow[]): GeneratedClassFeature[] {
  return rows
    .map((row) => ({
      level: row.levelGranted,
      name: row.feature.name,
      engName: row.feature.engName,
      description: row.feature.description,
    }))
    .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name, "uk"));
}

async function main() {
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const classes = await prisma.class.findMany({
    include: {
      features: { include: { feature: true } },
      subclasses: { include: { features: { include: { feature: true } } } },
    },
    orderBy: [{ ruleset: "asc" }, { sortOrder: "asc" }, { classId: "asc" }],
  });

  const data: GeneratedClass[] = classes.map((characterClass) => ({
    classId: characterClass.classId,
    key: characterClass.name,
    name: UA[characterClass.name] ?? characterClass.name,
    engName: ENG[characterClass.name] ?? characterClass.name,
    description: characterClass.description,
    hitDie: characterClass.hitDie,
    savingThrows: characterClass.savingThrows.map((ability) => abilityTranslations[ability] ?? ability),
    armorProficiencies: characterClass.armorProficiencies.map(
      (armor) => armorTypeTranslations[armor] ?? armor,
    ),
    toolProficiencies: characterClass.toolProficiencies.map((tool) => toolTranslations[tool] ?? tool),
    skillChoices: readSkillChoices(characterClass.skillProficiencies),
    spellcasting:
      characterClass.spellcastingType === "NONE"
        ? null
        : spellcastingTypeTranslations[characterClass.spellcastingType] ?? characterClass.spellcastingType,
    castingStat: characterClass.primaryCastingStat
      ? abilityTranslations[characterClass.primaryCastingStat] ?? characterClass.primaryCastingStat
      : null,
    subclassLevel: characterClass.subclassLevel,
    abilityScoreUpLevels: characterClass.abilityScoreUpLevels,
    features: collectFeatures(characterClass.features),
    subclasses: characterClass.subclasses
      .map((subclass) => ({
        subclassId: subclass.subclassId,
        key: subclass.name,
        name: findSubclassName(SUBCLASS_UA, subclass.name, subclass.ruleset),
        engName: findSubclassName(SUBCLASS_ENG, subclass.name, subclass.ruleset),
        description: subclass.description,
        source: findSubclassSource(characterClass.name, subclass.name, subclass.ruleset),
        legacy: subclass.ruleset === "RULES_2024" && isLegacySubclass2024(characterClass.name, subclass.name),
        features: collectFeatures(subclass.features),
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "uk")),
    ruleset: characterClass.ruleset,
  }));

  failOnShrunkCatalog("класи", data.length, MINIMUM_EXPECTED_CLASSES, "Спершу прожени сід класів у цільову базу.");

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");

  const per = data.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.ruleset] = (acc[entry.ruleset] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `classes.json: ${data.length} записів`,
    per,
    `підкласів: ${data.reduce((sum, entry) => sum + entry.subclasses.length, 0)}`,
  );

  await prisma.$disconnect();
  await pool.end();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main().catch((error) => {
  console.error(error);
  process.exit(1);
});
