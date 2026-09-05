/**
 * Generate static infusions.json from the database (2014 only).
 * Run: bun run generate:infusions
 */

import { PrismaClient, Ruleset, InfusionTargetType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';
import { failOnShrunkCatalog } from './lib/fail-on-shrunk-catalog';

dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/infusions.json');
export const ACTIVE_RULESET: Ruleset = 'RULES_2014';

/// Виміряно 2026-08-28. Стара перевірка ловила лише повний нуль — каталог, що всох з 66 до
/// одного рядка, вона пропускала.
export const MINIMUM_EXPECTED_INFUSIONS = 66;
const SOURCE = 'TCoE';

export type GeneratedInfusion = {
  id: number;
  name: string;
  nameUa: string;
  engName: string;
  minArtificerLevel: number;
  targetType: InfusionTargetType;
  requiresAttunement: boolean;
  bonusToAC: number | null;
  bonusToAttackRoll: number | null;
  bonusToDamage: number | null;
  spellAttackBonus: number | null;
  increasesAtLevel10By: number | null;
  speedBonus: number | null;
  description: string;
  shortDescription: string;
  ruleset: Ruleset;
  source: string;
};

type ReplicatedItem = {
  name: string;
  description: string;
};

type InfusionRow = {
  infusionId: number;
  name: string;
  engName: string;
  minArtificerLevel: number;
  targetType: InfusionTargetType;
  requiresAttunement: boolean;
  bonusToAC: number | null;
  bonusToAttackRoll: number | null;
  bonusToDamage: number | null;
  spellAttackBonus: number | null;
  increasesAtLevel10By: number | null;
  speedBonus: number | null;
  feature: { description: string; shortDescription: string | null } | null;
  replicatedMagicItem: ReplicatedItem | null;
};

// The magic item's `name` column already carries the bracketed English name, e.g. «Сумка зберігання [Bag of Holding]».
function buildReplicaDescription(item: ReplicatedItem): string {
  return `Ви створюєте магічний предмет: **${item.name}**.\n\n${item.description}`;
}

function buildReplicaShortDescription(item: ReplicatedItem): string {
  return `Репліка предмета ${item.name}`;
}

function readDescription(row: InfusionRow): string {
  if (row.feature) return row.feature.description;
  return row.replicatedMagicItem ? buildReplicaDescription(row.replicatedMagicItem) : '';
}

function readShortDescription(row: InfusionRow): string {
  if (row.feature) return row.feature.shortDescription ?? '';
  return row.replicatedMagicItem ? buildReplicaShortDescription(row.replicatedMagicItem) : '';
}

function buildInfusion(row: InfusionRow): GeneratedInfusion {
  return {
    id: row.infusionId,
    name: `${row.name} [${row.engName}]`,
    nameUa: row.name,
    engName: row.engName,
    minArtificerLevel: row.minArtificerLevel,
    targetType: row.targetType,
    requiresAttunement: row.requiresAttunement,
    bonusToAC: row.bonusToAC,
    bonusToAttackRoll: row.bonusToAttackRoll,
    bonusToDamage: row.bonusToDamage,
    spellAttackBonus: row.spellAttackBonus,
    increasesAtLevel10By: row.increasesAtLevel10By,
    speedBonus: row.speedBonus,
    description: readDescription(row),
    shortDescription: readShortDescription(row),
    ruleset: ACTIVE_RULESET,
    source: SOURCE,
  };
}

function findUntranslatedKeys(rows: InfusionRow[]): string[] {
  return rows.filter((row) => !row.name?.trim()).map((row) => row.engName || String(row.infusionId));
}

function findDescriptionlessKeys(rows: InfusionRow[]): string[] {
  return rows.filter((row) => !readDescription(row).trim() || !readShortDescription(row).trim()).map((row) => row.engName);
}

async function main() {
  console.log('🔧 Generating infusions.json from database...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const rows: InfusionRow[] = await prisma.infusion.findMany({
      where: { ruleset: ACTIVE_RULESET },
      include: { feature: true, replicatedMagicItem: true },
      orderBy: [{ infusionId: 'asc' }],
    });

    failOnShrunkCatalog('вливання', rows.length, MINIMUM_EXPECTED_INFUSIONS, 'Спершу прожени сід вливань у цільову базу.');

    const untranslated = findUntranslatedKeys(rows);
    if (untranslated.length > 0) {
      throw new Error(`No Ukrainian name for: ${untranslated.join(', ')} — translate them in the database first`);
    }

    const descriptionless = findDescriptionlessKeys(rows);
    if (descriptionless.length > 0) {
      throw new Error(
        `No description for: ${descriptionless.join(', ')} — each infusion needs a linked feature or a replicated magic item`,
      );
    }

    const data = rows.map(buildInfusion);

    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Generated ${data.length} infusions to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Failed to generate infusions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
