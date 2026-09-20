/**
 * KR31.18 — списки заклинань підкласів 2014 (розширені списки покровителів у `spell_classes`,
 * Магічна рука Містичного спритника в `subclass_spell`, вибір роду Джина). Без `--apply` лише показує різницю.
 *
 *   bun run seed:subclass-spell-lists-2014:test [-- --apply]   → .env.test, клон spells_test
 *   bun run seed:subclass-spell-lists-2014:prod [-- --apply]   → .env, робоча база spells
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { findSubclassSpellListDrift, seedSubclassSpellLists2014 } from "../prisma/seed/subclassSpellLists2014";

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
        "  bun run seed:subclass-spell-lists-2014:test   → .env.test, клон spells_test\n" +
        "  bun run seed:subclass-spell-lists-2014:prod   → .env, робоча база spells",
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
    throw new Error(`--target ${target} очікує базу на "${expectedSuffix}", а ${envFile} веде в "${dbName}". Зупинено.`);
  }

  return url;
}

const target = readTargetName(process.argv);
const apply = process.argv.includes("--apply");
const connectionString = resolveConnectionString(target);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const dbName = new URL(connectionString).pathname.replace(/^\//, "");
  console.log(`🚀 KR31.18 — списки заклинань підкласів 2014 для бази "${dbName}" (--target ${target}${apply ? ", --apply" : ", лише показ"})…\n`);

  const drift = await findSubclassSpellListDrift(prisma);
  for (const row of drift.missing) console.log(`  + ${row}`);
  for (const row of drift.extra) console.log(`  − ${row}`);
  if (!drift.isArcaneTricksterGranted) console.log("  + Містичний спритник: Магічна рука з 3-го рівня (subclass_spell)");
  for (const option of drift.genieKindMissing) console.log(`  + Рід джина: ${option}`);

  const outcome = await seedSubclassSpellLists2014(prisma, apply);
  console.log(`\n${apply ? "Записано" : "Буде записано"}: +${outcome.rowsCreated} рядків, −${outcome.rowsDeleted} рядків, +${outcome.grantsCreated} дарунків підкласу, +${outcome.genieKindsCreated} родів Джина.`);
  if (!apply) console.log("Це лише показ. Щоб записати, додайте --apply.");
}

main()
  .catch((error) => {
    console.error("FATAL Seeding Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
