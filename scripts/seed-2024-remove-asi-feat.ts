/**
 * KR31.4 — прибирає рису «Ability Score Improvement» (2024) з переліку рис.
 *
 * Сід видаляє контентний рядок, тому за замовчуванням лише показує, що зробив би; запис — з
 * `--apply`. Р28 тримає межу всередині самого сіду: рядок, на який хтось посилається, лишається.
 *
 *   bun run seed:remove-asi-feat-2024:test           → .env.test, показ
 *   bun run seed:remove-asi-feat-2024:test --apply   → .env.test, запис
 *   bun run seed:remove-asi-feat-2024:prod --apply   → .env, робоча база (запускає власник)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { removeAbilityScoreImprovementFeat2024 } from "../prisma/seed/removeAbilityScoreImprovementFeat2024";

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
        "  bun run seed:remove-asi-feat-2024:test   → .env.test, клон spells_test\n" +
        "  bun run seed:remove-asi-feat-2024:prod   → .env, робоча база spells",
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
const connectionString = resolveConnectionString(target);
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const dbName = new URL(connectionString).pathname.replace(/^\//, "");
  console.log(`🚀 KR31.4 — риса ASI 2024 для бази "${dbName}" (--target ${target})…\n`);

  await removeAbilityScoreImprovementFeat2024(prisma, process.argv.includes("--apply"));

  console.log("\n🎉 Готово.");
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
