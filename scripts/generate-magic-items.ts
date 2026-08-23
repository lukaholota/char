/**
 * Generate static magicItems.json from Prisma database
 * Run: npx tsx scripts/generate-magic-items.ts
 */

import { PrismaClient, Ruleset } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const OUTPUT_PATH = join(process.cwd(), 'src/lib/generated/magicItems.json');

// KR6.3: hardcoded until the edition switch (O6 Крок 5) lets pers.ruleset drive this.
export const ACTIVE_RULESET: Ruleset = "RULES_2014";

/**
 * Нижня межа каталогу. src/lib/generated/magicItems.json у .gitignore і з git НЕ
 * відновлюється, тому запис коротшого файла знищує каталог назавжди разом із
 * публічними адресами /magic-items/NNNN. У робочій базі станом на 2026-08-22 лежить
 * 248 рядків проти 473 у prisma/seed/magicItemSeed.ts — тобто без цієї перевірки
 * будь-який `bun run build` тут-таки викидає 225 предметів.
 *
 * Межу ПІДНІМАЮТЬ після того, як власник прогнав `bun run seed:magic-items:prod`,
 * а не прибирають. Полагодити недобір можна тільки сідом, не генератором.
 */
const MINIMUM_EXPECTED_ITEMS = 472;

export function failOnShrunkCatalog(actual: number, minimum = MINIMUM_EXPECTED_ITEMS): void {
  if (actual >= minimum) return;

  throw new Error(
    `Каталог магічних предметів схлопнувся: база віддала ${actual}, очікували щонайменше ${minimum}.\n` +
      "Файл НЕ перезаписано. Спершу прожени сід у цільову базу:\n" +
      "  bun run seed:magic-items:test   (перевірка)\n" +
      "  bun run seed:magic-items:prod   (застосовує власник)\n" +
      "Пояснення — docs/o14-magic-items-aidedd/kr14.1-single-source.md.",
  );
}

export function buildMagicItemsForGenerationQuery() {
  return {
    where: { ruleset: ACTIVE_RULESET },
    orderBy: [{ name: 'asc' as const }],
    // Select all fields we need for the UI and search
    select: {
      magicItemId: true,
      name: true,
      itemType: true,
      rarity: true,
      requiresAttunement: true,
      engName: true,
      description: true,
      shortDescription: true,
      weaponProficiencies: true,
      weaponProficienciesSpecial: true,
      bonusToAC: true,
      bonusToRangedDamage: true,
      bonusToSavingThrows: true,
      noArmorOrShieldForACBonus: true,
      givesSpells: {
        select: {
          spellId: true,
          name: true,
          engName: true,
          level: true,
        },
      },
    },
  };
}

async function main() {
  console.log('🔮 Generating magicItems.json from database...');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const magicItems = await prisma.magicItem.findMany(buildMagicItemsForGenerationQuery());

    // Transform to stable format if needed, but mostly direct dump
    const data = magicItems.map((item) => ({
      ...item,
      // Ensure JSON fields are handled correctly if they are null
      weaponProficiencies: item.weaponProficiencies ?? undefined,
      weaponProficienciesSpecial: item.weaponProficienciesSpecial ?? undefined,
      bonusToSavingThrows: item.bonusToSavingThrows ?? undefined,
    }));

    failOnShrunkCatalog(data.length);

    // Ensure directory exists
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

    // Write JSON file
    writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`✅ Generated ${data.length} magic items to ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Failed to generate magic items:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

