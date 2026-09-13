/**
 * Generate static races.json from the database — both rulesets in one file.
 * Run: npm run generate:races
 *
 * The 2014 and 2024 sets both live in `race`, so unlike the older catalogs this one has no
 * normalized-JSON half. That keeps the catalog reading exactly what the character creator reads.
 */

import { PrismaClient, type Ruleset } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import * as dotenv from "dotenv";

import {
  LanguageTranslations,
  SizeTranslations,
  raceTranslations,
  raceTranslationsEng,
  sourceTranslations,
  subraceTranslations,
  subraceTranslationsEng,
  variantTranslations,
  variantTranslationsEng,
} from "../src/lib/refs/translation";
import { formatCatalogASI } from "../src/lib/components/characterCreator/infoUtils";
import { failOnShrunkCatalog } from "./lib/fail-on-shrunk-catalog";

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), "src/lib/generated/races.json");

/// Виміряно 2026-08-28: 76 записів обох редакцій. Порогу тут не було, а каталог обслуговує
/// і сторінки рас, і крок вибору виду в майстрі.
export const MINIMUM_EXPECTED_RACES = 76;

export type GeneratedRaceTrait = {
  name: string;
  engName: string;
  description: string;
};

export type GeneratedRaceBranch = {
  key: string;
  name: string;
  engName: string;
  description: string | null;
  traits: GeneratedRaceTrait[];
};

export type GeneratedRace = {
  raceId: number;
  key: string;
  name: string;
  engName: string;
  description: string | null;
  source: string;
  sizes: string[];
  speed: number;
  extraSpeeds: { label: string; value: number }[];
  languages: string[];
  languagesToChooseCount: number;
  asiSummary: string;
  traits: GeneratedRaceTrait[];
  subraces: GeneratedRaceBranch[];
  variants: GeneratedRaceBranch[];
  ruleset: Ruleset;
};

const UA: Record<string, string> = raceTranslations;
const ENG: Record<string, string> = raceTranslationsEng;
const SUBRACE_UA: Record<string, string> = subraceTranslations;
const SUBRACE_ENG: Record<string, string> = subraceTranslationsEng;
const VARIANT_UA: Record<string, string> = variantTranslations;
const VARIANT_ENG: Record<string, string> = variantTranslationsEng;
const SOURCE_UA: Record<string, string> = sourceTranslations;

function findExtraSpeeds(race: {
  burrowSpeed: number;
  flightSpeed: number;
  swimSpeed: number;
  climbSpeed: number;
}) {
  return [
    { label: "Політ", value: race.flightSpeed },
    { label: "Плавання", value: race.swimSpeed },
    { label: "Лазіння", value: race.climbSpeed },
    { label: "Копання", value: race.burrowSpeed },
  ].filter((entry) => entry.value > 0);
}

type TraitRow = { feature: { name: string; engName: string; description: string } };

function collectTraits(rows: TraitRow[]): GeneratedRaceTrait[] {
  return rows.map((row) => ({
    name: row.feature.name,
    engName: row.feature.engName,
    description: row.feature.description,
  }));
}

async function main() {
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const races = await prisma.race.findMany({
    include: {
      traits: { include: { feature: true } },
      subraces: { include: { traits: { include: { feature: true } } } },
      raceVariants: { include: { traits: { include: { feature: true } } } },
    },
    orderBy: [{ ruleset: "asc" }, { sortOrder: "asc" }, { raceId: "asc" }],
  });

  const data: GeneratedRace[] = races.map((race) => ({
    raceId: race.raceId,
    key: race.name,
    name: UA[race.name] ?? race.name,
    engName: ENG[race.name] ?? race.name,
    description: race.description,
    source: SOURCE_UA[race.source] ?? race.source,
    sizes: race.size.map((size) => SizeTranslations[size] ?? size),
    speed: race.speed,
    extraSpeeds: findExtraSpeeds(race),
    languages: race.languages.map((language) => LanguageTranslations[language] ?? language),
    languagesToChooseCount: race.languagesToChooseCount,
    asiSummary: formatCatalogASI(race.ASI),
    traits: collectTraits(race.traits),
    subraces: race.subraces.map((subrace) => ({
      key: subrace.name,
      name: SUBRACE_UA[subrace.name] ?? subrace.name,
      engName: SUBRACE_ENG[subrace.name] ?? subrace.name,
      description: subrace.description,
      traits: collectTraits(subrace.traits),
    })),
    variants: race.raceVariants.map((variant) => ({
      key: variant.name,
      name: VARIANT_UA[variant.name] ?? variant.name,
      engName: VARIANT_ENG[variant.name] ?? variant.name,
      description: null,
      traits: collectTraits(variant.traits),
    })),
    ruleset: race.ruleset,
  }));

  failOnShrunkCatalog("раси", data.length, MINIMUM_EXPECTED_RACES, "Спершу прожени сід рас у цільову базу.");

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");

  const per = data.reduce<Record<string, number>>((acc, race) => {
    acc[race.ruleset] = (acc[race.ruleset] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`races.json: ${data.length} записів`, per);

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
