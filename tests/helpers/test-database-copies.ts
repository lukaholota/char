import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import type {} from "vitest";
import { assertTestDatabaseUrl } from "./assert-test-database-url";

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseSourceUrl: string;
    testDatabaseRunId: number;
  }
}

/**
 * Кожен прогін інтеграційних тестів працює не на `spells_test`, а на власних копіях —
 * по одній на воркер vitest: `spells_run_<pid>_w<VITEST_POOL_ID>_test`. Суфікс `_test`
 * лишається останнім, бо на нього дивиться assertTestDatabaseUrl. pid у назві — щоб
 * наступний прогін зміг прибрати копії після впалого процесу.
 */

const COPY_NAME = /^(.+)_run_(\d+)_w(\d+)_test$/;

export function readSourceDatabaseUrl(): string {
  const env = parse(readFileSync(".env.test", "utf8"));
  return assertTestDatabaseUrl(process.env.TEST_DATABASE_URL || env.DATABASE_URL);
}

export function findDatabaseName(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

export function replaceDatabaseName(url: string, databaseName: string): string {
  return url.replace(/^([a-z]+:\/\/[^/]+\/)[^?]*/, `$1${databaseName}`);
}

export function buildCopyDatabaseName(sourceName: string, runId: number, workerId: number): string {
  return `${sourceName.replace(/_test$/, "")}_run_${runId}_w${workerId}_test`;
}

export function buildCopyDatabaseUrl(sourceUrl: string, runId: number, workerId: number): string {
  const copyName = buildCopyDatabaseName(findDatabaseName(sourceUrl), runId, workerId);
  return replaceDatabaseName(sourceUrl, copyName);
}

export function findAbandonedCopyNames(
  databaseNames: string[],
  sourceName: string,
  isRunAlive: (runId: number) => boolean,
): string[] {
  const sourceStem = sourceName.replace(/_test$/, "");
  return databaseNames.filter((databaseName) => {
    const match = COPY_NAME.exec(databaseName);
    return match !== null && match[1] === sourceStem && !isRunAlive(Number(match[2]));
  });
}

/// EPERM значить, що процес є, але сигнал йому слати не можна (інший користувач або пісочниця
/// сесії). Мертвим вважаємо лише ESRCH — інакше прибирання знесло б копії живого прогону.
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}
