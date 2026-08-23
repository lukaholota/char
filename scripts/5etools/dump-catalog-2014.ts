/**
 * KR16.2 — знімає каталог 2014 з обраної бази у форматі `src/lib/generated/spells.json`.
 *
 *   npx tsx scripts/5etools/dump-catalog-2014.ts --target test --out <шлях>
 *
 * Потрібен, щоб виміряти виправлення на `spells_test`, поки прод ще не засіяний:
 * `src/lib/generated/spells.json` робиться з прода й показує стан до виправлень.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { writeFileSync } from "fs";
import * as dotenv from "dotenv";
import { buildSpellsForGenerationQuery } from "../generate-spells";

const ENV_FILES = { test: ".env.test", prod: ".env" } as const;

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function dumpCatalog(): Promise<void> {
  const target = readFlag("target");
  const out = readFlag("out");

  if (target !== "test" && target !== "prod") throw new Error("Вкажіть --target test|prod");
  if (!out) throw new Error("Вкажіть --out <шлях>");

  const url = dotenv.config({ path: ENV_FILES[target], quiet: true }).parsed?.DATABASE_URL;
  if (!url) throw new Error(`У ${ENV_FILES[target]} немає DATABASE_URL.`);

  const pool = new Pool({ connectionString: url });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const spells = await prisma.spell.findMany(buildSpellsForGenerationQuery());
    writeFileSync(out, JSON.stringify(spells.map(toStableShape), null, 2), "utf-8");
    console.log(`✅ ${spells.length} заклинань 2014 з "${new URL(url).pathname.slice(1)}" → ${out}`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

function toStableShape(spell: Record<string, unknown>) {
  return { ...spell, source: String(spell.source) };
}

dumpCatalog().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
