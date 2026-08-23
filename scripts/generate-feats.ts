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

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/feats.json');
export const ACTIVE_RULESET: Ruleset = "RULES_2014";

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

  let data: GeneratedFeat[] = [];

  const connString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (connString) {
    try {
      const pool = new Pool({ connectionString: connString });
      const adapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter });

      const feats = await prisma.feat.findMany({
        where: { ruleset: ACTIVE_RULESET },
        orderBy: [{ engName: 'asc' }],
      });

      if (feats.length > 0) {
        data = feats.map((f, idx) => ({
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
      }

      await prisma.$disconnect();
      await pool.end();
    } catch (e) {
      console.warn('⚠️ Could not fetch from database:', e);
    }
  }

  // Ensure directory exists
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  // Write JSON file
  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Generated ${data.length} feats to ${OUTPUT_PATH}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
