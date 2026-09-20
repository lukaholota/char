/**
 * Ефекти опцій вибору рис 2014 — половинні риси, Стійкий, Вундеркінд — у колонки `effect_*`
 * (BUG-004). Дописує лише ефекти; назви, групи й звʼязки тільки показує, дублікатів не видаляє.
 *
 *   bun run seed:feat-choice-options:test
 *   bun run seed:feat-choice-options:prod
 *
 * Без `--apply` показує, що змінилося б, і нічого не пише.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { findFeatChoiceOptionDrift, syncFeatChoiceEffectsFromSeed } from "../prisma/seed/featChoiceOptions2014";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

const target = readSeedTargetName(process.argv, "bun tsx scripts/seed-2014-feat-choice-options.ts");
const isApplying = process.argv.includes("--apply");
const connectionString = resolveSeedConnectionString(target);
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const databaseName = readDatabaseName(connectionString);
  const mode = isApplying ? "запис" : "показ без запису";
  console.log(`🎯 Опції вибору рис 2014 → "${databaseName}" (--target ${target}, ${mode})\n`);

  const drift = await findFeatChoiceOptionDrift(prisma);
  for (const option of drift.missing) console.log(`   немає в базі: ${option.optionNameEng}`);
  for (const option of drift.unlinked) console.log(`   не привʼязана до ${option.feat}: ${option.optionNameEng}`);
  for (const text of drift.staleTexts) console.log(`   ${text.optionNameEng}.${text.field}: «${text.database}» ≠ сід «${text.seed}»`);
  for (const { option } of drift.staleEffects) {
    console.log(`   ефект: ${option.optionNameEng} ← ${option.effectKind} ${option.effectAbility ?? option.effectSkill}`);
  }

  const structuralDrift = drift.missing.length + drift.unlinked.length + drift.staleTexts.length;
  if (structuralDrift > 0) {
    throw new Error(`${structuralDrift} розбіжностей поза ефектами — сід не збігається з базою, писати не буду.`);
  }

  if (drift.staleEffects.length === 0) {
    console.log("✅ База вже збігається із сідом — писати нема чого.");
    return;
  }

  if (!isApplying) {
    console.log(`\n${drift.staleEffects.length} опцій без ефекту. Запис: додайте --apply.`);
    return;
  }

  const applied = await syncFeatChoiceEffectsFromSeed(prisma);
  console.log(`\n✅ Ефектів записано: ${applied}.`);
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
