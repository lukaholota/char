import { Pool, PoolClient } from "pg";
import { readSeedTargetName, resolveSeedConnectionString, readDatabaseName } from "./lib/seed-target";
import { normalizeUkrainianApostrophes } from "../src/lib/refs/ukrainian-apostrophe";

/// Таблиці контенту — те, що сідиться з файлів репозиторію й після проходу по файлах має
/// дорівнювати їм байт у байт ([Р33](../docs/DECISIONS.md#р33)). Дані гравців сюди не входять:
/// написання в імені персонажа — вибір гравця, не наш.
const CONTENT_TABLES = [
  "background",
  "choice_option",
  "class",
  "class_feature",
  "class_optional_feature",
  "class_starting_equipment_option",
  "fighting_style",
  "subclass",
  "creature",
  "feat",
  "feature",
  "equipment_pack",
  "infusion",
  "magic_item",
  "weapon",
  "race",
  "race_choice_option",
  "race_variant",
  "subrace",
  "spell",
  "spell_classes",
  "spell_races",
] as const;

/// Той самий запит, що в tests/user-data.ts і scripts/db-clone.sh — розходитися їм не можна.
const USER_DATA_TABLES_QUERY = `
  WITH RECURSIVE user_data(oid) AS (
    SELECT c.oid
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relname IN ('pers', 'user', 'account')
    UNION
    SELECT con.conrelid
      FROM pg_constraint con
      JOIN user_data u ON con.confrelid = u.oid
     WHERE con.contype = 'f'
  )
  SELECT c.relname AS table_name
    FROM user_data u
    JOIN pg_class c ON c.oid = u.oid
`;

const NONCANONICAL_APOSTROPHE_SQL = "[''’‘`´]";

type TextColumn = { table: string; column: string; dataType: string };
type PlannedCell = { table: string; column: string; dataType: string; ctid: string; value: string };

async function main(): Promise<void> {
  const isApplying = process.argv.includes("--apply");
  const target = readSeedTargetName(process.argv, "bun run seed:apostrophe");
  const connectionString = resolveSeedConnectionString(target);
  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    console.log(`ʼ Апостроф у таблицях контенту, база "${readDatabaseName(connectionString)}"`);
    console.log(isApplying ? "   режим: ЗАПИС (--apply)\n" : "   режим: лише перевірка; запис — з --apply\n");

    await client.query("BEGIN");
    await refuseUserDataTables(client);
    const columns = await listTextColumns(client);
    const planned = await planCells(client, columns);
    printPlan(planned);

    if (!isApplying || planned.length === 0) {
      await client.query("ROLLBACK");
      console.log(isApplying ? "\n✅ Писати нічого." : "\n✅ Перевірка пройшла. Запуск із --apply запише.");
      return;
    }

    for (const cell of planned) await writeCell(client, cell);
    await client.query("COMMIT");
    console.log(`\n✅ Записано ${planned.length} комірок.`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function refuseUserDataTables(client: PoolClient): Promise<void> {
  const { rows } = await client.query<{ table_name: string }>(USER_DATA_TABLES_QUERY);
  const userTables = new Set(rows.map((row) => row.table_name));
  const collisions = CONTENT_TABLES.filter((table) => userTables.has(table));
  if (collisions.length > 0) {
    throw new Error(`Таблиці користувача в переліку контенту: ${collisions.join(", ")}. Зупинено.`);
  }
}

async function listTextColumns(client: PoolClient): Promise<TextColumn[]> {
  const { rows } = await client.query<{ table_name: string; column_name: string; data_type: string }>(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
        AND data_type IN ('text', 'character varying', 'json', 'jsonb')
      ORDER BY table_name, ordinal_position`,
    [[...CONTENT_TABLES]]
  );
  return rows.map((row) => ({ table: row.table_name, column: row.column_name, dataType: row.data_type }));
}

async function planCells(client: PoolClient, columns: TextColumn[]): Promise<PlannedCell[]> {
  const planned: PlannedCell[] = [];
  for (const { table, column, dataType } of columns) {
    const { rows } = await client.query<{ ctid: string; value: string }>(
      `SELECT ctid::text AS ctid, "${column}"::text AS value
         FROM "${table}"
        WHERE "${column}"::text ~ '${NONCANONICAL_APOSTROPHE_SQL}'`
    );
    for (const row of rows) {
      const value = normalizeUkrainianApostrophes(row.value);
      if (value !== row.value) planned.push({ table, column, dataType, ctid: row.ctid, value });
    }
  }
  return planned;
}

function printPlan(planned: PlannedCell[]): void {
  const counts = new Map<string, number>();
  for (const cell of planned) {
    const key = `${cell.table}.${cell.column}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const [key, count] of counts) console.log(`  → ${key}: ${count}`);
  console.log(`\n  до запису: ${planned.length} комірок у ${counts.size} колонках`);
}

async function writeCell(client: PoolClient, cell: PlannedCell): Promise<void> {
  const cast = cell.dataType === "json" || cell.dataType === "jsonb" ? `::${cell.dataType}` : "";
  await client.query(`UPDATE "${cell.table}" SET "${cell.column}" = $1${cast} WHERE ctid = $2::tid`, [
    cell.value,
    cell.ctid,
  ]);
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
