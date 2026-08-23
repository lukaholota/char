/**
 * KR16.2 — розширені списки заклинань 2014 у базу.
 *
 *   bun run seed:spell-lists:test   → .env.test, клон spells_test
 *   bun run seed:spell-lists:prod   → .env, робоча база spells
 *
 * Потребує колонки `spell_classes.source` — db/changes/2026-08-23-kr16.2-spell-classes-source.sql.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { seedExtendedSpellLists2014 } from "../prisma/seed/extendedSpellLists2014";

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
        "  bun run seed:spell-lists:test   → .env.test, клон spells_test\n" +
        "  bun run seed:spell-lists:prod   → .env, робоча база spells\n" +
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
    console.log(`🔮 Розширені списки заклинань 2014 у базі "${dbName}" (--target ${target})…\n`);

    const outcome = await seedExtendedSpellLists2014(prisma);
    console.log(
      `  створено рядків spell_classes: ${outcome.rowsCreated}` +
        `\n  проставлено книгу наявним рядкам: ${outcome.rowsAttributed}` +
        `\n  уже було правильно: ${outcome.rowsAlreadyRight}`
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
