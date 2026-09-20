/**
 * Каталог метамагії 2014 із бази → src/lib/generated/metamagic.json.
 * Run: npx tsx scripts/generate-metamagic.ts
 */

import { PrismaClient, Ruleset } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { failOnShrunkCatalog } from './lib/fail-on-shrunk-catalog';

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/metamagic.json');
export const ACTIVE_RULESET: Ruleset = 'RULES_2014';

/// PHB 8 + TCoE 2, виміряно 2026-09-14 (O35).
export const MINIMUM_EXPECTED_METAMAGIC = 10;

const METAMAGIC_GROUP_NAME = 'Метамагія';

/// Звірено з `optionalfeatures.json` 5etools: решта варіантів — PHB.
export const TASHA_METAMAGIC = new Set(['Seeking Spell', 'Transmuted Spell']);

/// Ціна Twinned Spell 2014 — рівень заклинання; `usePrice` у фічі тримає лише мінімум.
export const COST_BY_SPELL_LEVEL_2014 = new Set(['Twinned Spell']);

export type GeneratedMetamagic = {
  id: number;
  name: string;
  nameUa: string;
  engName: string;
  cost: number;
  isCostSpellLevel: boolean;
  description: string;
  shortDescription: string;
  ruleset: Ruleset;
  source: string;
};

type MetamagicFeature = {
  name: string;
  description: string;
  shortDescription: string | null;
  usePrice: number;
};

type MetamagicRow = {
  optionNameEng: string;
  features: { feature: MetamagicFeature }[];
};

function buildMetamagic(row: MetamagicRow, index: number): GeneratedMetamagic {
  const feature = row.features[0]?.feature;
  if (!feature?.name) throw new Error(`Metamagic ${row.optionNameEng} has no linked feature with a Ukrainian name`);

  return {
    id: index + 1,
    name: `${feature.name} [${row.optionNameEng}]`,
    nameUa: feature.name,
    engName: row.optionNameEng,
    cost: feature.usePrice,
    isCostSpellLevel: COST_BY_SPELL_LEVEL_2014.has(row.optionNameEng),
    description: feature.description,
    shortDescription: feature.shortDescription ?? '',
    ruleset: ACTIVE_RULESET,
    source: TASHA_METAMAGIC.has(row.optionNameEng) ? 'TCOE' : 'PHB',
  };
}

async function main() {
  console.log('🪄 Generating metamagic.json from database...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const rows: MetamagicRow[] = await prisma.choiceOption.findMany({
      where: { groupName: METAMAGIC_GROUP_NAME, ruleset: ACTIVE_RULESET },
      include: { features: { include: { feature: true } } },
      orderBy: [{ choiceOptionId: 'asc' }],
    });

    failOnShrunkCatalog('метамагія', rows.length, MINIMUM_EXPECTED_METAMAGIC, 'Спершу прожени сід класових виборів 2014 у цільову базу.');

    const data = rows.map(buildMetamagic);

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Generated ${data.length} metamagic options to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Failed to generate metamagic:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
