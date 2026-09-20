/**
 * Вибори підкласів 2024 (KR31.2) разом із заклинаннями опцій — Коло землі (KR37.3).
 *
 * Ганяється поверх `seed:2024`: підкласи й заклинання 2024 уже мають бути в базі. Перелік бере з
 * `data/2024/normalized/subclass-choices.json`. Ідемпотентний — повторний запуск дає ті самі рядки.
 *
 *   bun run seed:subclass-choices-2024:test   → .env.test, клон spells_test
 *   bun run seed:subclass-choices-2024:prod   → .env, робоча база (запускає власник)
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { seedSubclassChoices2024 } from "../prisma/seed/subclassChoices2024";

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
        "  bun run seed:subclass-choices-2024:test   → .env.test, клон spells_test\n" +
        "  bun run seed:subclass-choices-2024:prod   → .env, робоча база spells",
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
  console.log(`🚀 Вибори підкласів 2024 і заклинання їхніх опцій для бази "${dbName}" (--target ${target})…\n`);

  await seedSubclassChoices2024(prisma);

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
