/**
 * Generate static backgrounds.json from the database (2014 only).
 * Run: bun run generate:backgrounds
 */

import { PrismaClient, Ruleset } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { backgroundTranslations, backgroundTranslationsEng } from '../src/lib/refs/translation';

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/backgrounds.json');
export const ACTIVE_RULESET: Ruleset = 'RULES_2014';

const ukrainianNames: Record<string, string> = backgroundTranslations;
const englishNames: Record<string, string> = backgroundTranslationsEng;

export type GeneratedBackgroundItem = {
  name: string;
  quantity: number;
};

export type GeneratedBackground = {
  backgroundId: number;
  key: string;
  name: string;
  engName: string;
  source: string;
  description: string;
  skillProficiencies: string[];
  skillChoiceCount: number;
  toolProficiencies: string[];
  languagesToChooseCount: number;
  items: GeneratedBackgroundItem[];
  specialAbilityName: string | null;
  ruleset: Ruleset;
};

type BackgroundRow = {
  backgroundId: number;
  name: string;
  source: string;
  description: string | null;
  specialAbilityName: string | null;
  skillProficiencies: unknown;
  toolProficiencies: string[];
  languagesToChooseCount: number;
  items: unknown;
};

// The column holds either a plain skill list or a `{ choices, choiceCount }` pick — «Власна» is the only row of the second kind.
function readSkillProficiencies(raw: unknown): { fixed: string[]; choiceCount: number } {
  if (Array.isArray(raw)) {
    return { fixed: raw.map(String), choiceCount: 0 };
  }
  if (raw && typeof raw === 'object') {
    const choice = raw as { choices?: unknown; choiceCount?: unknown };
    const choices = Array.isArray(choice.choices) ? choice.choices.map(String) : [];
    const fixed = choices.filter((skill) => skill !== 'ANY');
    return { fixed, choiceCount: Number(choice.choiceCount) || 0 };
  }
  return { fixed: [], choiceCount: 0 };
}

function readItems(raw: unknown): GeneratedBackgroundItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is { name: unknown; quantity: unknown } => Boolean(item) && typeof item === 'object')
    .map((item) => ({ name: String(item.name ?? ''), quantity: Number(item.quantity) || 1 }))
    .filter((item) => item.name.length > 0);
}

function buildBackground(row: BackgroundRow): GeneratedBackground {
  const skills = readSkillProficiencies(row.skillProficiencies);

  return {
    backgroundId: row.backgroundId,
    key: row.name,
    name: ukrainianNames[row.name] ?? row.name,
    engName: englishNames[row.name] ?? row.name,
    source: String(row.source),
    description: row.description ?? '',
    skillProficiencies: skills.fixed,
    skillChoiceCount: skills.choiceCount,
    toolProficiencies: row.toolProficiencies.map(String),
    languagesToChooseCount: row.languagesToChooseCount,
    items: readItems(row.items),
    specialAbilityName: row.specialAbilityName,
    ruleset: ACTIVE_RULESET,
  };
}

function findUntranslatedKeys(rows: BackgroundRow[]): string[] {
  return rows.filter((row) => !ukrainianNames[row.name] || !englishNames[row.name]).map((row) => row.name);
}

async function main() {
  console.log('📜 Generating backgrounds.json from database...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const rows: BackgroundRow[] = await prisma.background.findMany({
      where: { ruleset: ACTIVE_RULESET },
      orderBy: [{ backgroundId: 'asc' }],
    });

    if (rows.length === 0) {
      throw new Error(`No ${ACTIVE_RULESET} backgrounds in the database — refusing to write an empty catalog`);
    }

    const untranslated = findUntranslatedKeys(rows);
    if (untranslated.length > 0) {
      throw new Error(`No translation for: ${untranslated.join(', ')} — add them to translation.ts first`);
    }

    const data = rows.map(buildBackground);

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Generated ${data.length} backgrounds to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Failed to generate backgrounds:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
