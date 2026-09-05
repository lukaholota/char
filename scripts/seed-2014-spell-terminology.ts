import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
import { seedSpellTerminology2014 } from "../prisma/seed/spellTerminology2014";

const TARGETS = {
  test: { envFile: ".env.test", expectedSuffix: "_test" },
  prod: { envFile: ".env", expectedSuffix: "spells" },
} as const;

type TargetName = keyof typeof TARGETS;

function readTargetName(argv: string[]): TargetName {
  const flagIndex = argv.indexOf("--target");
  const name = flagIndex === -1 ? undefined : argv[flagIndex + 1];

  if (name === "test" || name === "prod") return name;
  throw new Error(
    "Сідер пише в базу, тому цільову базу треба назвати явно — дефолту немає.\n" +
      "  bun run seed:spell-terminology:test   → .env.test, клон spells_test\n" +
      "  bun run seed:spell-terminology:prod   → .env, робоча база spells"
  );
}

function resolveConnectionString(target: TargetName): string {
  const parsed = dotenv.config({ path: TARGETS[target].envFile, quiet: true });
  if (parsed.error) throw new Error(`Не читається ${TARGETS[target].envFile}: ${parsed.error.message}`);

  const url = parsed.parsed?.DATABASE_URL;
  if (!url) throw new Error(`У ${TARGETS[target].envFile} немає DATABASE_URL.`);

  const databaseName = new URL(url).pathname.replace(/^\//, "");
  if (!databaseName.endsWith(TARGETS[target].expectedSuffix)) {
    throw new Error(
      `--target ${target} очікує базу на "${TARGETS[target].expectedSuffix}", ` +
        `а ${TARGETS[target].envFile} веде в "${databaseName}". Зупинено.`
    );
  }
  return url;
}

async function main(): Promise<void> {
  const target = readTargetName(process.argv);
  const connectionString = resolveConnectionString(target);
  const databaseName = new URL(connectionString).pathname.replace(/^\//, "");
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    console.log(`🔮 Термінологія 2014 у базі "${databaseName}" (--target ${target})…\n`);
    const applied = await seedSpellTerminology2014(prisma);
    console.log(`\n✅ Термінологія 2014: застосовано ${applied.length} записів.`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
