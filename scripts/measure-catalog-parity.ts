/**
 * KR12.5 — де саме розходяться три набори кожного каталогу: таблиця в базі, генерований
 * JSON (2014, який показує застосунок) і нормалізований JSON 2024.
 *
 *   bun tsx scripts/measure-catalog-parity.ts --target test
 *   bun tsx scripts/measure-catalog-parity.ts --target test --catalog magic-items --names
 *
 * Числа в доках застарівають за дні; цей скрипт існує, щоб журнал KR не переписував їх з памʼяті.
 */

import { Pool } from "pg";
import { readFileSync } from "fs";
import { readDatabaseName, readSeedTargetName, resolveSeedConnectionString } from "./lib/seed-target";

type CatalogRow = Record<string, unknown>;

type CatalogSpec = {
  key: string;
  title: string;
  generatedPath: string | null;
  normalizedPath: string | null;
  /// Ключ зіставлення. Каталоги на енамі (обладунки, зброя, передісторії) тримають у базі код,
  /// а не англійську назву, і порівняння за `engName` дає 100% фальшивих розбіжностей.
  readKey: (row: CatalogRow) => string;
  selectKeys: (ruleset: "RULES_2014" | "RULES_2024") => { text: string; values: unknown[] };
};

const readEngName = (row: CatalogRow) => String(row.engName ?? "");
const readCodeOrDerive = (row: CatalogRow) => String(row.code ?? row.key ?? toEnumCode(String(row.engName ?? "")));

/// `Studded Leather Armor` → `STUDDED_LEATHER_ARMOR`: так енами й називаються в схемі.
export function toEnumCode(engName: string): string {
  return engName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const INVOCATION_GROUP_NAME = "Потойбічні виклики";

const fromColumn = (table: string, column: string) => (ruleset: string) => ({
  text: `SELECT ${column} AS key FROM public.${table} WHERE ruleset = $1::public."Ruleset"`,
  values: [ruleset],
});

const CATALOGS: CatalogSpec[] = [
  {
    key: "magic-items",
    title: "Магічні предмети",
    generatedPath: "src/lib/generated/magicItems.json",
    normalizedPath: "data/2024/normalized/magic-items.json",
    readKey: readEngName,
    selectKeys: fromColumn("magic_item", "eng_name"),
  },
  {
    key: "spells",
    title: "Заклинання",
    generatedPath: "src/lib/generated/spells.json",
    normalizedPath: "data/2024/normalized/spells.json",
    readKey: readEngName,
    selectKeys: fromColumn("spell", "eng_name"),
  },
  {
    key: "feats",
    title: "Риси",
    generatedPath: "src/lib/generated/feats.json",
    normalizedPath: "data/2024/normalized/feats.json",
    readKey: readEngName,
    selectKeys: fromColumn("feat", "eng_name"),
  },
  {
    key: "backgrounds",
    title: "Передісторії",
    generatedPath: "src/lib/generated/backgrounds.json",
    normalizedPath: "data/2024/normalized/backgrounds.json",
    readKey: readCodeOrDerive,
    selectKeys: fromColumn("background", "name::text"),
  },
  {
    key: "armor",
    title: "Обладунки",
    generatedPath: "src/lib/generated/armor.json",
    normalizedPath: "data/2024/normalized/armor.json",
    readKey: readCodeOrDerive,
    selectKeys: fromColumn("armor", "name::text"),
  },
  {
    key: "weapons",
    title: "Зброя",
    generatedPath: "src/lib/generated/weapons.json",
    normalizedPath: "data/2024/normalized/weapons.json",
    readKey: readCodeOrDerive,
    selectKeys: fromColumn("weapon", "name::text"),
  },
  {
    key: "infusions",
    title: "Вливання",
    generatedPath: "src/lib/generated/infusions.json",
    normalizedPath: null,
    readKey: readEngName,
    selectKeys: fromColumn("infusion", "eng_name"),
  },
  {
    key: "invocations",
    title: "Потойбічні виклики",
    generatedPath: "src/lib/generated/invocations.json",
    normalizedPath: "data/2024/normalized/invocations.json",
    readKey: readEngName,
    selectKeys: (ruleset) => ({
      text: `SELECT option_name_eng AS key FROM public.choice_option
             WHERE group_name = $1 AND ruleset = $2::public."Ruleset"`,
      values: [INVOCATION_GROUP_NAME, ruleset],
    }),
  },
];

type CatalogMeasurement = {
  spec: CatalogSpec;
  db2014: Set<string>;
  db2024: Set<string>;
  generated: Set<string>;
  normalized: Set<string>;
};

async function main() {
  const target = readSeedTargetName(process.argv, "bun tsx scripts/measure-catalog-parity.ts");
  const connectionString = resolveSeedConnectionString(target);
  const only = readFlagValue(process.argv, "--catalog");
  const withNames = process.argv.includes("--names");

  const pool = new Pool({ connectionString });
  try {
    console.log(`📏 Каталоги → база "${readDatabaseName(connectionString)}" (--target ${target})\n`);

    const specs = only ? CATALOGS.filter((c) => c.key === only) : CATALOGS;
    if (specs.length === 0) throw new Error(`Немає каталогу "${only}". Є: ${CATALOGS.map((c) => c.key).join(", ")}`);

    const measurements: CatalogMeasurement[] = [];
    for (const spec of specs) measurements.push(await measureCatalog(pool, spec));

    printCountsTable(measurements);
    for (const measurement of measurements) printDivergence(measurement, withNames);
  } finally {
    await pool.end();
  }
}

async function measureCatalog(pool: Pool, spec: CatalogSpec): Promise<CatalogMeasurement> {
  return {
    spec,
    db2014: await selectKeySet(pool, spec, "RULES_2014"),
    db2024: await selectKeySet(pool, spec, "RULES_2024"),
    generated: readKeySet(spec, spec.generatedPath),
    normalized: readKeySet(spec, spec.normalizedPath),
  };
}

async function selectKeySet(pool: Pool, spec: CatalogSpec, ruleset: "RULES_2014" | "RULES_2024"): Promise<Set<string>> {
  const { text, values } = spec.selectKeys(ruleset);
  const result = await pool.query(text, values);
  return new Set(result.rows.map((row: { key: string }) => normalizeKey(row.key)));
}

function readKeySet(spec: CatalogSpec, path: string | null): Set<string> {
  if (!path) return new Set();
  const rows = JSON.parse(readFileSync(path, "utf8")) as CatalogRow[];
  return new Set(rows.map((row) => normalizeKey(spec.readKey(row))));
}

/// Регістр, апострофи й подвійні пробіли — це те, де ховаються фальшиві розбіжності. Суфікс
/// редакції знімається окремо, і виглядає він двояко: енам `BackgroundCategory` пише
/// `FARMER_2024`, а назва фічі в `choice_option` — «Agonizing Blast (2024)». Другий вигляд
/// довго не знімався, і звірка щоразу показувала 31 виклик «лише в таблиці» проти 31 «лише
/// у файлі» — ті самі 31. Файл каталогу суфікса не має в жодному вигляді.
export function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/_2024$/, "")
    .replace(/\s*\(2024\)$/, "");
}

function printCountsTable(measurements: CatalogMeasurement[]) {
  console.log("| Каталог | таблиця 2014 | generated (2014) | таблиця 2024 | normalized (2024) |");
  console.log("|---|---:|---:|---:|---:|");
  for (const { spec, db2014, db2024, generated, normalized } of measurements) {
    const normalizedCell = spec.normalizedPath ? String(normalized.size) : "—";
    console.log(`| ${spec.title} | ${db2014.size} | ${generated.size} | ${db2024.size} | ${normalizedCell} |`);
  }
  console.log();
}

type ComparedPair = {
  label: string;
  leftName: string;
  left: Set<string>;
  rightName: string;
  right: Set<string>;
};

function printDivergence({ spec, db2014, db2024, generated, normalized }: CatalogMeasurement, withNames: boolean) {
  const table = "таблиця";
  reportPair({ label: `${spec.title} · 2014`, leftName: table, left: db2014, rightName: "generated", right: generated }, withNames);
  if (spec.normalizedPath) {
    reportPair({ label: `${spec.title} · 2024`, leftName: table, left: db2024, rightName: "normalized", right: normalized }, withNames);
  }
}

function reportPair({ label, leftName, left, rightName, right }: ComparedPair, withNames: boolean) {
  const onlyLeft = [...left].filter((name) => !right.has(name)).sort();
  const onlyRight = [...right].filter((name) => !left.has(name)).sort();

  if (onlyLeft.length === 0 && onlyRight.length === 0) {
    console.log(`✅ ${label}: ${leftName} і ${rightName} збігаються поіменно (${left.size}).`);
    return;
  }

  console.log(`⚠️  ${label}: лише в ${leftName} — ${onlyLeft.length}, лише в ${rightName} — ${onlyRight.length}.`);
  if (withNames) {
    if (onlyLeft.length) console.log(`    лише в ${leftName}: ${onlyLeft.join(", ")}`);
    if (onlyRight.length) console.log(`    лише в ${rightName}: ${onlyRight.join(", ")}`);
  }
}

function readFlagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

/// Модуль імпортують тести заради `normalizeKey`/`toEnumCode`, тож CLI запускається лише коли
/// файл викликали напряму: інакше імпорт полізе в базу й убʼє процес тесту.
if (process.argv[1]?.endsWith("measure-catalog-parity.ts")) {
  main().catch((error) => {
    console.error("FATAL:", error);
    process.exit(1);
  });
}
