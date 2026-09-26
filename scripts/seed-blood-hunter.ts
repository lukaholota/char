/**
 * O45 — Мисливець за кровʼю в обох редакціях. Без `--apply` лише показує план.
 *
 *   bun run seed:blood-hunter:test [-- --apply]   → .env.test, клон spells_test
 *   bun run seed:blood-hunter:prod [-- --apply]   → .env, робоча база spells
 *
 * На прод — лише після DDL `db/changes/2026-09-26-o45-blood-hunter-enums.sql`.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { BloodHunterSeedReport, seedBloodHunter } from "../prisma/seed/bloodHunter";

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
        "  bun run seed:blood-hunter:test   → .env.test, клон spells_test\n" +
        "  bun run seed:blood-hunter:prod   → .env, робоча база spells",
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

function printReport(report: BloodHunterSeedReport): void {
  console.log(`  ${report.ruleset}: створити ${report.created.length}, оновити ${report.updated.length}`);
  for (const line of report.created) console.log(`      + ${line}`);
}

const target = readTargetName(process.argv);
const apply = process.argv.includes("--apply");
const connectionString = resolveConnectionString(target);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const dbName = new URL(connectionString).pathname.replace(/^\//, "");
  console.log(`🩸 O45 — Мисливець за кровʼю для бази "${dbName}" (--target ${target}${apply ? ", --apply" : ", лише показ"})…\n`);

  const reports = await seedBloodHunter(prisma, apply);
  reports.forEach(printReport);
  if (!apply) console.log("\nЦе лише показ. Щоб записати, додайте --apply.");
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
