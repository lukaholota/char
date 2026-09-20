import { execFileSync } from "node:child_process";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import {
  buildCopyDatabaseName,
  findCopyRunId,
  findDatabaseName,
  readSourceDatabaseUrl,
  replaceDatabaseName,
} from "./helpers/test-database-copies";

/**
 * Тільки для vitest.integration.config.mts. Замість замка на одну спільну `spells_test`
 * кожен прогін отримує власні копії (`CREATE DATABASE … TEMPLATE spells_test`, ~24 МБ,
 * копіюється на сервері), по одній на воркер, і зносить їх у teardown. Тому паралельні
 * сесії не витирають одна одній фікстури, а файли всередині прогону можуть іти паралельно.
 *
 * Єдина умова Postgres: у момент копіювання до `spells_test` ніхто не підключений. Сіди
 * й dev-сервер тримають зʼєднання секунди, тож копіювання просто чекає й повторює спробу.
 *
 * Джерело за замовчуванням — локальний Postgres із scripts/local-test-db.sh (піднімається
 * звідси сам); TEST_DATABASE_URL повертає на будь-яку іншу базу з суфіксом _test.
 */

const SOURCE_BUSY = "55006";
const WAIT_FOR_SOURCE_SECONDS = 600;

export async function setup(project: TestProject): Promise<() => Promise<void>> {
  const sourceUrl = readSourceDatabaseUrl();
  const sourceName = findDatabaseName(sourceUrl);
  const runId = process.pid;
  const copies = listWorkerIds(project).map((workerId) =>
    buildCopyDatabaseName(sourceName, runId, workerId),
  );

  startLocalPostgresIfNeeded(sourceUrl);
  await withMaintenanceClient(sourceUrl, async (client) => {
    await assertSourceExists(client, sourceName);
    await dropAbandonedCopies(client, sourceName);
    for (const copy of copies) await createCopy(client, sourceName, copy);
  });

  project.provide("testDatabaseSourceUrl", sourceUrl);
  project.provide("testDatabaseRunId", runId);

  return () =>
    withMaintenanceClient(sourceUrl, async (client) => {
      for (const copy of copies) await dropCopy(client, copy);
    });
}

function startLocalPostgresIfNeeded(sourceUrl: string): void {
  const { hostname, port } = new URL(sourceUrl);
  const isLocal = hostname === "127.0.0.1" || hostname === "localhost";
  if (!isLocal || port !== (process.env.TEST_PG_PORT ?? "5433")) return;
  execFileSync("scripts/local-test-db.sh", ["start"], { stdio: ["ignore", "ignore", "inherit"] });
}

async function assertSourceExists(client: Client, sourceName: string): Promise<void> {
  const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [sourceName]);
  if (!rowCount) {
    throw new Error(`Бази ${sourceName} нема. Локальну знімають так: scripts/local-test-db.sh clone ${sourceName}`);
  }
}

function listWorkerIds(project: TestProject): number[] {
  return Array.from({ length: project.config.maxWorkers }, (_, index) => index + 1);
}

async function withMaintenanceClient<T>(sourceUrl: string, run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: replaceDatabaseName(sourceUrl, "postgres") });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function createCopy(client: Client, sourceName: string, copyName: string): Promise<void> {
  let waited = 0;
  let announced = false;
  for (;;) {
    try {
      await client.query(`CREATE DATABASE "${copyName}" TEMPLATE "${sourceName}"`);
      return;
    } catch (error) {
      if (!isSourceBusy(error) || waited >= WAIT_FOR_SOURCE_SECONDS) throw error;
      await dropIdleConnections(client, sourceName);
      if (!announced) {
        console.error(`⏳ до ${sourceName} хтось підключений — чекаю, щоб зняти копію ${copyName}`);
        announced = true;
      }
      await sleepSeconds(2);
      waited += 2;
    }
  }
}

// Забутий скрипт із відкритим зʼєднанням блокував би кожен прогін на 10 хв. Живий сід
// не зачепиться: він або виконує запит, або був холостий менше пів хвилини.
async function dropIdleConnections(client: Client, sourceName: string): Promise<void> {
  await client.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = $1 AND pid <> pg_backend_pid()
        AND state = 'idle' AND state_change < now() - interval '30 seconds'`,
    [sourceName],
  );
}

function isSourceBusy(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === SOURCE_BUSY;
}

async function dropCopy(client: Client, copyName: string): Promise<void> {
  await client.query(`DROP DATABASE IF EXISTS "${copyName}" WITH (FORCE)`);
}

async function dropAbandonedCopies(client: Client, sourceName: string): Promise<void> {
  const prefix = buildCopyDatabaseName(sourceName, 0, 0).replace(/0_w0_test$/, "");
  const { rows } = await client.query<{ datname: string }>(
    "SELECT datname FROM pg_database WHERE datname LIKE $1",
    [`${prefix}%_test`],
  );
  for (const { datname } of rows) {
    const runId = findCopyRunId(datname);
    if (runId === null || isProcessAlive(runId)) continue;
    console.error(`🧹 прибираю копію ${datname} після впалого прогону ${runId}`);
    await dropCopy(client, datname);
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function sleepSeconds(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
