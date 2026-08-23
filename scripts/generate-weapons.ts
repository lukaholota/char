/**
 * Generate static weapons.json from the database (2014 only).
 * Run: npx tsx scripts/generate-weapons.ts
 */

import { PrismaClient, Ruleset, WeaponCategory, WeaponType, WeaponProperty, DamageType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { weaponTranslations, weaponTranslationsEng } from '../src/lib/refs/translation';

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/weapons.json');
export const ACTIVE_RULESET: Ruleset = 'RULES_2014';

// The `weapon` table has no source column; the whole 2014 catalog comes from the PHB.
const SOURCE = 'PHB_2014';

const ukrainianNames: Record<string, string> = weaponTranslations;
const englishNames: Record<string, string> = weaponTranslationsEng;

export type GeneratedWeapon = {
  id: number;
  code: WeaponCategory;
  name: string;
  nameUa: string;
  engName: string;
  damage: string;
  damageType: DamageType;
  weaponType: WeaponType;
  properties: WeaponProperty[];
  normalRange: number | null;
  longRange: number | null;
  versatileDamage: string | null;
  isRanged: boolean;
  isAdditional: boolean;
  ruleset: Ruleset;
  source: string;
};

type WeaponRow = {
  weaponId: number;
  name: WeaponCategory;
  damage: string;
  damageType: DamageType;
  weaponType: WeaponType;
  properties: WeaponProperty[];
  normalRange: number | null;
  longRange: number | null;
  versatileDamage: string | null;
  isRanged: boolean;
  isAdditional: boolean;
};

function buildWeapon(row: WeaponRow): GeneratedWeapon {
  const nameUa = ukrainianNames[row.name];
  const engName = englishNames[row.name];

  return {
    id: row.weaponId,
    code: row.name,
    name: `${nameUa} [${engName}]`,
    nameUa,
    engName,
    damage: row.damage,
    damageType: row.damageType,
    weaponType: row.weaponType,
    properties: row.properties,
    normalRange: row.normalRange,
    longRange: row.longRange,
    versatileDamage: row.versatileDamage,
    isRanged: row.isRanged,
    isAdditional: row.isAdditional,
    ruleset: ACTIVE_RULESET,
    source: SOURCE,
  };
}

function findUntranslatedCodes(rows: WeaponRow[]): string[] {
  return rows.filter((row) => !ukrainianNames[row.name] || !englishNames[row.name]).map((row) => row.name);
}

async function main() {
  console.log('⚔️ Generating weapons.json from database...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const rows: WeaponRow[] = await prisma.weapon.findMany({
      where: { ruleset: ACTIVE_RULESET },
      orderBy: [{ weaponId: 'asc' }],
      select: {
        weaponId: true,
        name: true,
        damage: true,
        damageType: true,
        weaponType: true,
        properties: true,
        normalRange: true,
        longRange: true,
        versatileDamage: true,
        isRanged: true,
        isAdditional: true,
      },
    });

    if (rows.length === 0) {
      throw new Error(`No ${ACTIVE_RULESET} weapons in the database — refusing to write an empty catalog`);
    }

    const untranslated = findUntranslatedCodes(rows);
    if (untranslated.length > 0) {
      throw new Error(`No translation for: ${untranslated.join(', ')} — add them to translation.ts first`);
    }

    const data = rows.map(buildWeapon);

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Generated ${data.length} weapons to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Failed to generate weapons:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
