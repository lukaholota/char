/**
 * Якорі на стани, дії (KR34.4) і заклинання (KR25.5) в описах фіч, рис, передісторій і варіантів
 * раси 2014 — із сідів у базу.
 * Пише лише `description` і `shortDescription` і лише там, де без якорів текст не змінився.
 *
 *   bun run seed:rule-term-anchors:test
 *   bun run seed:rule-term-anchors:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { ANCHORED_ENTITIES, findContentAnchorDrift, writeContentAnchors } from "./rule-term-links/rule-term-anchors-2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-rule-term-anchors.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const databaseName = readDatabaseName(connectionString);
  console.log(`🔗 Якорі на стани, дії й заклинання 2014 → "${databaseName}" (--target ${target}, ${isApplying ? "запис" : "показ без запису"})\n`);

  const { changes, textMismatches } = await findContentAnchorDrift(prisma);
  for (const entity of ANCHORED_ENTITIES) {
    console.log(`   ${entity}: ${changes.filter((change) => change.entity === entity).length}`);
  }

  if (textMismatches.length > 0) {
    console.log(`\n⚠️  Текст у базі розійшовся із сідом не лише якорями — пропущено (${textMismatches.length}):`);
    for (const mismatch of textMismatches) console.log(`   ${mismatch.entity} ${mismatch.key} .${mismatch.field}`);
  }

  if (changes.length === 0) {
    console.log("\n✅ Якорі вже в базі — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(`\n${changes.length} описів дістануть якорі. Запис: додайте --apply.`);
    return;
  }

  await writeContentAnchors(prisma, changes);
  console.log(`\n✍︎ Записано ${changes.length} описів. Далі — bun run generate:content, щоб доїхало до каталогів.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
