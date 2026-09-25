/**
 * O43 / KR43.2 — легасі-підкласи під класами 2024. Без `--apply` лише показує план.
 *
 *   bun run seed:legacy-subclasses-2024:test [-- --apply]   → .env.test, клон spells_test
 *   bun run seed:legacy-subclasses-2024:prod [-- --apply]   → .env, робоча база spells
 *
 * На прод — лише після викатки KR43.3: без неї наступна збірка падає в `generate:classes`.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { isLegacySubclassDiffEmpty, LinkDiff } from "../prisma/seed/helpers/legacySubclassPlan";
import { LegacySubclassOutcome, seedLegacySubclasses2024 } from "../prisma/seed/legacySubclasses2024";

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
        "  bun run seed:legacy-subclasses-2024:test   → .env.test, клон spells_test\n" +
        "  bun run seed:legacy-subclasses-2024:prod   → .env, робоча база spells",
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

function printOutcome({ entry, diff }: LegacySubclassOutcome): void {
  const title = `${entry.class2024}/${entry.subclass} (${entry.source})`;
  if (isLegacySubclassDiffEmpty(diff)) {
    console.log(`  = ${title}: без змін`);
    return;
  }

  console.log(`  ${diff.row === "create" ? "+" : "~"} ${title}${diff.row ? `: рядок subclass — ${diff.row === "create" ? "створити" : "оновити"}` : ""}`);
  printLinks("риси", diff.features, (link) => `${link.engName} на ${link.levelGranted}-му`);
  printLinks("вибори", diff.choiceOptions, (link) => `choice_option ${link.choiceOptionId} на [${link.levelsGranted.join(", ")}]`);
  printLinks("заклинання", diff.spells, (link) => `spell ${link.spellId} на ${link.classLevel}-му`);
}

function printLinks<T>(label: string, links: LinkDiff<T>, describe: (link: T) => string): void {
  for (const link of links.upsert) console.log(`      + ${label}: ${describe(link)}`);
  for (const link of links.remove) console.log(`      − ${label}: ${describe(link)}`);
}

const target = readTargetName(process.argv);
const apply = process.argv.includes("--apply");
const connectionString = resolveConnectionString(target);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const dbName = new URL(connectionString).pathname.replace(/^\//, "");
  console.log(`🚀 O43 — легасі-підкласи 2024 для бази "${dbName}" (--target ${target}${apply ? ", --apply" : ", лише показ"})…\n`);

  const outcomes = await seedLegacySubclasses2024(prisma, apply);
  outcomes.forEach(printOutcome);

  const changed = outcomes.filter((outcome) => !isLegacySubclassDiffEmpty(outcome.diff)).length;
  console.log(`\n${apply ? "Записано" : "Буде записано"}: ${changed} з ${outcomes.length} підкласів мають зміни.`);
  if (!apply && changed) console.log("Це лише показ. Щоб записати, додайте --apply.");
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
