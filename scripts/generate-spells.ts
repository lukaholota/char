/**
 * Generate static spells.json from Prisma database
 * Run: npx tsx scripts/generate-spells.ts
 * 
 * This script exports all spells to a JSON file that is used
 * for SSG pages at build time. After generation, the build
 * can proceed without database access.
 */

import { PrismaClient, Ruleset } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { failOnShrunkCatalog } from './lib/fail-on-shrunk-catalog';

// Load environment variables
dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/spells.json');

// KR6.3: hardcoded until the edition switch (O6 Крок 5) lets pers.ruleset drive this.
export const ACTIVE_RULESET: Ruleset = "RULES_2014";

/// Виміряно 2026-08-28. Порогу тут не було взагалі — база з недосіяними заклинаннями мовчки
/// стирала публічні адреси /spell/NNNN.
export const MINIMUM_EXPECTED_SPELLS = 525;

export function buildSpellsForGenerationQuery() {
  return {
    where: { ruleset: ACTIVE_RULESET },
    orderBy: [{ level: 'asc' as const }, { name: 'asc' as const }],
    select: {
      spellId: true,
      name: true,
      engName: true,
      level: true,
      school: true,
      castingTime: true,
      duration: true,
      range: true,
      components: true,
      description: true,
      source: true,
      hasRitual: true,
      hasConcentration: true,
      spellClasses: { select: { className: true, source: true } },
      spellRaces: { select: { raceName: true } },
    },
  };
}

async function main() {
  console.log('🔮 Generating spells.json from database...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const spells = await prisma.spell.findMany(buildSpellsForGenerationQuery());

    // Transform to stable format
    failOnShrunkCatalog('заклинання', spells.length, MINIMUM_EXPECTED_SPELLS, 'Спершу прожени сід заклинань у цільову базу.');

    const data = spells.map((s) => ({
      spellId: s.spellId,
      name: s.name,
      engName: s.engName,
      level: s.level,
      school: s.school,
      castingTime: s.castingTime,
      duration: s.duration,
      range: s.range,
      components: s.components,
      description: s.description,
      source: String(s.source),
      hasRitual: s.hasRitual,
      hasConcentration: s.hasConcentration,
      spellClasses: s.spellClasses,
      spellRaces: s.spellRaces,
    }));

    // Ensure directory exists
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

    // Write JSON file
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Generated ${data.length} spells to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Failed to generate spells:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

