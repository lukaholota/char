/**
 * Ціль сіду задається явно — дефолту немає, бо помилка коштує запису в production.
 */

import * as dotenv from "dotenv";

const TARGETS = {
  test: { envFile: ".env.test", expectedSuffix: "_test" },
  prod: { envFile: ".env", expectedSuffix: "spells" },
} as const;

export type SeedTargetName = keyof typeof TARGETS;

export function readSeedTargetName(argv: string[], scriptName: string): SeedTargetName {
  const flagIndex = argv.indexOf("--target");
  const name = flagIndex === -1 ? undefined : argv[flagIndex + 1];

  if (name !== "test" && name !== "prod") {
    throw new Error(
      "Цільову базу треба назвати явно — дефолту немає.\n" +
        `  ${scriptName} --target test   → .env.test, клон spells_test\n` +
        `  ${scriptName} --target prod   → .env, робоча база spells`,
    );
  }

  return name;
}

export function resolveSeedConnectionString(target: SeedTargetName): string {
  const { envFile, expectedSuffix } = TARGETS[target];
  const parsed = dotenv.config({ path: envFile, quiet: true });

  if (parsed.error) {
    throw new Error(`Не читається ${envFile}: ${parsed.error.message}`);
  }

  const url = parsed.parsed?.DATABASE_URL;
  if (!url) {
    throw new Error(`У ${envFile} немає DATABASE_URL.`);
  }

  const dbName = readDatabaseName(url);
  if (!dbName.endsWith(expectedSuffix)) {
    throw new Error(
      `--target ${target} очікує базу на "${expectedSuffix}", а ${envFile} веде в "${dbName}". Зупинено.`,
    );
  }

  return url;
}

export function readDatabaseName(connectionString: string): string {
  return new URL(connectionString).pathname.replace(/^\//, "");
}
