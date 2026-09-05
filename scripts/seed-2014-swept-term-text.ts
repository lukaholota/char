/**
 * Текст, який правила зачистка термінів 2014, із сідів → база: назва, короткий і повний опис
 * фіч підкласів і вливань та опис підкласів — за білим списком імен. Привʼязки, рівні видачі й
 * решту рядків не чіпає, на відміну від повних сідерів.
 *
 *   bun run seed:swept-term-text:test
 *   bun run seed:swept-term-text:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { findSweptTextDrift, syncSweptTextFromSeed } from "../prisma/seed/sweptTermText2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-swept-term-text.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const databaseName = readDatabaseName(connectionString);
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`📝 Зведений текст 2014 → "${databaseName}" (--target ${target}, ${mode})\n`);

  const drift = await findSweptTextDrift(prisma);
  for (const change of drift) console.log(`   ${change.entity} ${change.key} — ${change.field}`);

  if (drift.length === 0) {
    console.log("✅ База вже збігається із сідом — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(`\n${drift.length} полів розходяться із сідом. Запис: додайте --apply.`);
    return;
  }

  const applied = await syncSweptTextFromSeed(prisma);
  console.log(`\n✅ Оновлено ${applied.length} полів.`);
}

main()
  .catch((error) => {
    console.error("FATAL:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
