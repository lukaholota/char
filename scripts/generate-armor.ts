/**
 * Generate static armor.json from the database (2014 only).
 * Run: npx tsx scripts/generate-armor.ts
 */

import { PrismaClient, Ruleset, ArmorCategory, ArmorType, Ability, AbilityBonusType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { armorTranslations, armorTranslationsEng } from '../src/lib/refs/translation';
import { failOnShrunkCatalog } from './lib/fail-on-shrunk-catalog';

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/armor.json');
export const ACTIVE_RULESET: Ruleset = 'RULES_2014';

const ukrainianNames: Record<string, string> = armorTranslations;
const englishNames: Record<string, string> = armorTranslationsEng;

const ARMOR_SOURCE = 'PHB_2014';

type RulebookFacts = {
  weight: string;
  cost: string;
  donDoffTime: string;
  isStandardEquipment: boolean;
};

// PHB 2014 table values — none of these have a column in the `armor` table, so they live here.
const rulebookFactsByCode: Record<string, RulebookFacts> = {
  PADDED: { weight: '8 фнт.', cost: '5 зм', donDoffTime: '1 хвилина / 1 хвилина', isStandardEquipment: true },
  LEATHER: { weight: '10 фнт.', cost: '10 зм', donDoffTime: '1 хвилина / 1 хвилина', isStandardEquipment: true },
  STUDDED_LEATHER: { weight: '13 фнт.', cost: '45 зм', donDoffTime: '1 хвилина / 1 хвилина', isStandardEquipment: true },
  HIDE: { weight: '12 фнт.', cost: '10 зм', donDoffTime: '5 хвилин / 1 хвилина', isStandardEquipment: true },
  CHAIN_SHIRT: { weight: '20 фнт.', cost: '50 зм', donDoffTime: '5 хвилин / 1 хвилина', isStandardEquipment: true },
  SCALE_MAIL: { weight: '45 фнт.', cost: '50 зм', donDoffTime: '5 хвилин / 1 хвилина', isStandardEquipment: true },
  BREASTPLATE: { weight: '20 фнт.', cost: '400 зм', donDoffTime: '5 хвилин / 1 хвилина', isStandardEquipment: true },
  HALF_PLATE: { weight: '40 фнт.', cost: '750 зм', donDoffTime: '5 хвилин / 1 хвилина', isStandardEquipment: true },
  RING_MAIL: { weight: '40 фнт.', cost: '30 зм', donDoffTime: '10 хвилин / 5 хвилин', isStandardEquipment: true },
  CHAIN_MAIL: { weight: '55 фнт.', cost: '75 зм', donDoffTime: '10 хвилин / 5 хвилин', isStandardEquipment: true },
  SPLINT: { weight: '60 фнт.', cost: '200 зм', donDoffTime: '10 хвилин / 5 хвилин', isStandardEquipment: true },
  PLATE: { weight: '65 фнт.', cost: '1500 зм', donDoffTime: '10 хвилин / 5 хвилин', isStandardEquipment: true },
  SHIELD: { weight: '6 фнт.', cost: '10 зм', donDoffTime: '1 дія / 1 дія', isStandardEquipment: true },
  UNARMORED_DEFENSE_MONK: { weight: '-', cost: '-', donDoffTime: '-', isStandardEquipment: false },
  UNARMORED_DEFENSE_BARBARIAN: { weight: '-', cost: '-', donDoffTime: '-', isStandardEquipment: false },
  NATURAL_ARMOR_TORTLE: { weight: '-', cost: '-', donDoffTime: '-', isStandardEquipment: false },
  NATURAL_ARMOR_13_DEX: { weight: '-', cost: '-', donDoffTime: '-', isStandardEquipment: false },
  NATURAL_ARMOR_12_DEX: { weight: '-', cost: '-', donDoffTime: '-', isStandardEquipment: false },
  NATURAL_ARMOR_12_CON: { weight: '-', cost: '-', donDoffTime: '-', isStandardEquipment: false },
  HOMEBREW: { weight: '-', cost: '-', donDoffTime: '-', isStandardEquipment: false },
};

export type GeneratedArmor = {
  id: number;
  code: ArmorCategory;
  name: string;
  nameUa: string;
  engName: string;
  armorType: ArmorType;
  baseAC: number;
  abilityBonuses: Ability[];
  abilityBonusType: AbilityBonusType;
  strengthReq: number | null;
  stealthDisadvantage: boolean;
  weight: string;
  cost: string;
  donDoffTime: string;
  isStandardEquipment: boolean;
  ruleset: Ruleset;
  source: string;
};

type ArmorRow = {
  armorId: number;
  name: ArmorCategory;
  armorType: ArmorType;
  baseAC: number;
  strengthReq: number | null;
  stealthDisadvantage: boolean;
  abilityBonuses: Ability[];
  abilityBonusType: AbilityBonusType;
};

function buildArmor(row: ArmorRow): GeneratedArmor {
  const nameUa = ukrainianNames[row.name];
  const engName = englishNames[row.name];
  const facts = rulebookFactsByCode[row.name];

  return {
    id: row.armorId,
    code: row.name,
    name: `${nameUa} [${engName}]`,
    nameUa,
    engName,
    armorType: row.armorType,
    baseAC: row.baseAC,
    abilityBonuses: row.abilityBonuses,
    abilityBonusType: row.abilityBonusType,
    strengthReq: row.strengthReq,
    stealthDisadvantage: row.stealthDisadvantage,
    weight: facts.weight,
    cost: facts.cost,
    donDoffTime: facts.donDoffTime,
    isStandardEquipment: facts.isStandardEquipment,
    ruleset: ACTIVE_RULESET,
    source: ARMOR_SOURCE,
  };
}

/// Нижня межа каталогу 2014. `src/lib/generated/armor.json` у `.gitignore` і з git не
/// відновлюється, а `generate:content` висить на `prebuild` — тобто база, у якій бракує
/// рядка, мовчки стирає його публічну сторінку. Саме це вже сталося з `PADDED`, коли той
/// опинився в `RULES_2024`. Поріг рухають разом із каталогом, а не прибирають. — KR16.5
const MINIMUM_EXPECTED_ARMOR = 20;

const REQUIRED_CODES: ArmorCategory[] = [
  'PADDED', 'LEATHER', 'STUDDED_LEATHER', 'HIDE', 'CHAIN_SHIRT', 'SCALE_MAIL',
  'BREASTPLATE', 'HALF_PLATE', 'RING_MAIL', 'CHAIN_MAIL', 'SPLINT', 'PLATE', 'SHIELD',
];

function findMissingRequiredCodes(rows: ArmorRow[]): ArmorCategory[] {
  const present = new Set(rows.map((row) => row.name));
  return REQUIRED_CODES.filter((code) => !present.has(code));
}

function findUntranslatedCodes(rows: ArmorRow[]): string[] {
  return rows.filter((row) => !ukrainianNames[row.name] || !englishNames[row.name]).map((row) => row.name);
}

function findCodesWithoutRulebookFacts(rows: ArmorRow[]): string[] {
  return rows.filter((row) => !rulebookFactsByCode[row.name]).map((row) => row.name);
}

async function main() {
  console.log('🛡️ Generating armor.json from database...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const rows: ArmorRow[] = await prisma.armor.findMany({
      where: { ruleset: ACTIVE_RULESET },
      orderBy: [{ armorId: 'asc' }],
      select: {
        armorId: true,
        name: true,
        armorType: true,
        baseAC: true,
        strengthReq: true,
        stealthDisadvantage: true,
        abilityBonuses: true,
        abilityBonusType: true,
      },
    });

    failOnShrunkCatalog('обладунки', rows.length, MINIMUM_EXPECTED_ARMOR, `Рядки ${ACTIVE_RULESET} перевіряй у базі, а не в генераторі.`);

    const missing = findMissingRequiredCodes(rows);
    if (missing.length > 0) {
      throw new Error(
        `У ${ACTIVE_RULESET} немає категорій: ${missing.join(', ')} — перевірте ruleset цих рядків, каталог не перезаписано`
      );
    }

    const untranslated = findUntranslatedCodes(rows);
    if (untranslated.length > 0) {
      throw new Error(`No translation for: ${untranslated.join(', ')} — add them to translation.ts first`);
    }

    const withoutFacts = findCodesWithoutRulebookFacts(rows);
    if (withoutFacts.length > 0) {
      throw new Error(`No rulebook weight/cost/don-doff data for: ${withoutFacts.join(', ')} — add them to rulebookFactsByCode first`);
    }

    const data = rows.map(buildArmor);

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Generated ${data.length} armor entries to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Failed to generate armor:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
