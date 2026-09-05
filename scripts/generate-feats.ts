/**
 * Generate static feats.json from Prisma database or seed data
 * Run: npx tsx scripts/generate-feats.ts
 */

import { PrismaClient, Ruleset } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { featTranslations } from '../src/lib/refs/translation';
import { failOnShrunkCatalog } from './lib/fail-on-shrunk-catalog';

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/feats.json');
export const ACTIVE_RULESET: Ruleset = "RULES_2014";

/// Виміряно 2026-08-28. До цього генератор ловив недоступну базу в `console.warn` і писав
/// порожній масив із кодом виходу 0 — тобто `bun run build` знищував каталог рис і зеленів.
export const MINIMUM_EXPECTED_FEATS = 92;

export type GeneratedFeat = {
  featId: number;
  name: string;
  engName: string;
  source: string;
  description: string;
  shortDescription: string;
  category?: string | null;
  isRepeatable?: boolean;
  prerequisiteLevel?: number | null;
  prerequisiteFeat?: string | null;
  prerequisiteSpellcasting?: boolean;
  prerequisiteAbilityScore?: unknown;
  prerequisiteProficiency?: unknown;
  raceRestriction?: string[];
  subraceRestriction?: string[];
  grantedASI?: unknown;
  grantedSkillCount?: number;
  grantedLanguages?: string[];
  ruleset: Ruleset;
};

async function main() {
  console.log('🗡️ Generating feats.json...');

  const connString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!connString) {
    throw new Error('Немає ні TEST_DATABASE_URL, ні DATABASE_URL — каталог рис не перезаписано');
  }

  const pool = new Pool({ connectionString: connString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const feats = await prisma.feat.findMany({
      where: { ruleset: ACTIVE_RULESET },
      orderBy: [{ engName: 'asc' }],
    });

    failOnShrunkCatalog('риси', feats.length, MINIMUM_EXPECTED_FEATS, 'Спершу прожени сід рис у цільову базу.');

    const data: GeneratedFeat[] = feats.map((f, idx) => ({
      featId: f.featId || idx + 1,
      name: featTranslations[f.name] || f.engName,
      engName: f.engName,
      source: String(f.source),
      description: f.description,
      shortDescription: f.shortDescription,
      category: f.category || null,
      isRepeatable: f.isRepeatable,
      prerequisiteLevel: f.prerequisiteLevel,
      prerequisiteFeat: f.prerequisiteFeat,
      prerequisiteSpellcasting: f.prerequisiteSpellcasting,
      prerequisiteAbilityScore: f.prerequisiteAbilityScore,
      prerequisiteProficiency: f.prerequisiteProficiency,
      raceRestriction: f.raceRestriction.map(String),
      subraceRestriction: f.subraceRestriction.map(String),
      grantedASI: f.grantedASI,
      grantedSkillCount: f.grantedSkillCount,
      grantedLanguages: f.grantedLanguages.map(String),
      ruleset: "RULES_2014" as Ruleset,
    }));

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Generated ${data.length} feats to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Failed to generate feats:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
