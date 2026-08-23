/**
 * KR16.2 — виправна фаза каталогу заклинань 2014.
 *
 *   bun run seed:spell-fixes:test   → .env.test, клон spells_test
 *   bun run seed:spell-fixes:prod   → .env, робоча база spells
 *
 * Спершу зливаються два дублікати (`Arcane Hand`, `Arcane Sword`), потім застосовуються
 * механічні виправлення з data/2014/corrections/spells.json.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { seedSpellCorrections2014 } from "../prisma/seed/spellCorrections2014";
import { mergeDuplicateSpells2014 } from "../prisma/seed/spellDuplicateMerge2014";

const TARGETS = {
  test: { envFile: ".env.test", expectedSuffix: "_test" },
  prod: { envFile: ".env", expectedSuffix: "spells" },
} as const;

type TargetName = keyof typeof TARGETS;

function readTargetName(argv: string[]): TargetName {
  const flagIndex = argv.indexOf("--target");
  const name = flagIndex === -1 ? undefined : argv[flagIndex + 1];

  if (name !== "test" && name !== "prod") {
    throw new Error(
      "Сідер пише в базу, тому цільову базу треба назвати явно — дефолту немає.\n" +
        "  bun run seed:spell-fixes:test   → .env.test, клон spells_test\n" +
        "  bun run seed:spell-fixes:prod   → .env, робоча база spells\n" +
        "Клон піднімається так: ./scripts/db-clone.sh spells_test full"
    );
  }

  return name;
}

function resolveConnectionString(target: TargetName): string {
  const { envFile, expectedSuffix } = TARGETS[target];
  const parsed = dotenv.config({ path: envFile, quiet: true });

  if (parsed.error) throw new Error(`Не читається ${envFile}: ${parsed.error.message}`);

  const url = parsed.parsed?.DATABASE_URL;
  if (!url) throw new Error(`У ${envFile} немає DATABASE_URL.`);

  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!dbName.endsWith(expectedSuffix)) {
    throw new Error(
      `--target ${target} очікує базу на "${expectedSuffix}", а ${envFile} веде в "${dbName}". Зупинено.`
    );
  }

  return url;
}

async function main(): Promise<void> {
  const target = readTargetName(process.argv);
  const connectionString = resolveConnectionString(target);
  const dbName = new URL(connectionString).pathname.replace(/^\//, "");

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log(`🔮 Виправлення каталогу 2014 у базі "${dbName}" (--target ${target})…\n`);

    const merge = await mergeDuplicateSpells2014(prisma);
    for (const row of merge.merged) {
      console.log(
        `  злито «${row.drop}» → «${row.keep}»: перенесено ${row.persSpellsMoved} ` +
          `рядків pers_spell, знято ${row.persSpellsDropped} як дублікат`
      );
    }
    for (const name of merge.skipped) console.log(`  «${name}» уже злито — пропущено`);

    const corrections = await seedSpellCorrections2014(prisma);
    console.log(
      `\n  виправлено заклинань: ${corrections.applied.length}` +
        `\n  додано класів: ${corrections.classRowsAdded}` +
        `\n  прибрано класів: ${corrections.classRowsRemoved}` +
        `\n  прибрано дублікатів у spell_classes: ${corrections.duplicateClassRowsRemoved}`
    );
    console.log("\n🎉 Готово.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
