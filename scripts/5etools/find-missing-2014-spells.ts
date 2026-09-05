/// KR17.3 — заклинання 2014, що є в пінованому корпусі 5etools і яких немає в жодному нашому
/// каталозі. Жодне з них не Unearthed Arcana: усі з виданих супліментів (AI, SCC, BMT, LLK,
/// AAG, IDRotF, SatO, AitFR-AVT, GGR), тобто це контент, який має бути в бібліотеці.
///
/// Каталог 2014 живе в базі, а `src/lib/generated/spells.json` — похідний від РОБОЧОЇ бази
/// (Р13). Сід у `spells_test` штатного числа не рухає, тому каталог задається явно і завжди
/// друкується поруч із числом:
///
///   bun run find:missing-2014        каталог із generated JSON — робоча база
///   bun run find:missing-2014:test   каталог напряму зі spells_test

import { readFileSync } from "fs";
import * as dotenv from "dotenv";
import { Pool } from "pg";
import { findLooseNameKey, readSpells } from "./schema";

type CatalogName = "generated" | "test";

type Catalog = {
  label: string;
  records: number;
  keys: Set<string>;
};

async function main(): Promise<void> {
  const catalogName = readCatalogName(process.argv);
  const catalog2014 = await readCatalog2014(catalogName);
  const catalog2024 = readCatalog2024();
  reportMissing(catalog2014, findMissing(catalog2014, catalog2024));
}

function readCatalogName(argv: string[]): CatalogName {
  const flag = argv.find((argument) => argument.startsWith("--catalog"));
  const value = flag?.includes("=") ? flag.split("=")[1] : argv[argv.indexOf("--catalog") + 1];

  if (!flag) return "generated";
  if (value === "generated" || value === "test") return value;

  throw new Error(
    "--catalog приймає лише generated або test.\n" +
      "  generated → src/lib/generated/spells.json, похідний від робочої бази\n" +
      "  test      → каталог 2014 напряму зі spells_test",
  );
}

async function readCatalog2014(name: CatalogName): Promise<Catalog> {
  return name === "test" ? readTestDatabaseCatalog() : readGeneratedCatalog();
}

function readGeneratedCatalog(): Catalog {
  const records = readJsonNames("src/lib/generated/spells.json");
  return {
    label: "src/lib/generated/spells.json (похідний від робочої бази)",
    records: records.length,
    keys: new Set(records.map(findLooseNameKey)),
  };
}

async function readTestDatabaseCatalog(): Promise<Catalog> {
  const url = readTestDatabaseUrl();
  const databaseName = new URL(url).pathname.replace(/^\//, "");
  const pool = new Pool({ connectionString: url });

  try {
    const { rows } = await pool.query<{ eng_name: string }>(
      "select eng_name from spell where ruleset = 'RULES_2014'",
    );
    return {
      label: `база ${databaseName}`,
      records: rows.length,
      keys: new Set(rows.map((row) => findLooseNameKey(row.eng_name))),
    };
  } finally {
    await pool.end();
  }
}

function readTestDatabaseUrl(): string {
  const url = dotenv.config({ path: ".env.test", quiet: true }).parsed?.DATABASE_URL;
  if (!url) throw new Error("У .env.test немає DATABASE_URL.");

  const databaseName = new URL(url).pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_test")) {
    throw new Error(`--catalog test очікує базу на "_test", а .env.test веде в "${databaseName}".`);
  }
  return url;
}

function readCatalog2024(): Set<string> {
  return new Set(readJsonNames("data/2024/normalized/spells.json").map(findLooseNameKey));
}

function readJsonNames(path: string): string[] {
  return (JSON.parse(readFileSync(path, "utf8")) as { engName: string }[]).map((r) => r.engName);
}

function findMissing(catalog2014: Catalog, catalog2024: Set<string>): Map<string, string[]> {
  const bySource = new Map<string, string[]>();
  const seen = new Set<string>();

  for (const spell of readSpells()) {
    if (spell.edition !== "RULES_2014") continue;
    const key = findLooseNameKey(spell.nameEng);
    if (catalog2014.keys.has(key) || catalog2024.has(key) || seen.has(key)) continue;
    seen.add(key);
    if (!bySource.has(spell.source)) bySource.set(spell.source, []);
    bySource.get(spell.source)!.push(spell.nameEng);
  }

  return bySource;
}

function reportMissing(catalog2014: Catalog, bySource: Map<string, string[]>): void {
  const total = [...bySource.values()].reduce((sum, names) => sum + names.length, 0);

  console.log(`Каталог 2014: ${catalog2014.label} — ${catalog2014.records} записів`);
  console.log(`Заклинань 2014 у корпусі, яких немає в жодному нашому каталозі: ${total}\n`);

  for (const [source, names] of [...bySource].sort((a, b) => b[1].length - a[1].length)) {
    const shown = names.slice(0, 5).join(", ");
    console.log(`${String(names.length).padStart(4)}  ${source}   ${shown}${names.length > 5 ? " …" : ""}`);
  }
}

main().catch((error) => {
  console.error("FATAL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
