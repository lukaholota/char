/**
 * Generate static spells.json from Prisma database
 * Run: npx tsx scripts/generate-spells.ts
 * 
 * This script exports all spells to a JSON file that is used
 * for SSG pages at build time. After generation, the build
 * can proceed without database access.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/spells.json');

async function main() {
  console.log('🔮 Generating spells.json from database...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  try {
    const spells = await prisma.spell.findMany({
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
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
        spellClasses: { select: { className: true } },
        spellRaces: { select: { raceName: true } },
      },
    });

    // Transform to stable format
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

main();

