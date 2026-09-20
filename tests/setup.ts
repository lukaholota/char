import { config } from "dotenv";
import { inject } from "vitest";
import { assertTestDatabaseUrl } from "./helpers/assert-test-database-url";
import { buildCopyDatabaseUrl } from "./helpers/test-database-copies";

config({ path: ".env.test", quiet: true });

process.env.DATABASE_URL = findDatabaseUrlForThisWorker();
assertTestDatabaseUrl(process.env.DATABASE_URL);
process.env.PRISMA_TRANSACTION_TIMEOUT_MS ??= "30000";

// Інтеграційний конфіг через global-setup-db-copies.ts дає кожному воркеру власну копію
// spells_test. Юніт-конфіг нічого не provide-ить — там лишається адреса з .env.test.
function findDatabaseUrlForThisWorker(): string | undefined {
  const runId = inject("testDatabaseRunId");
  if (runId === undefined) return process.env.DATABASE_URL;
  return buildCopyDatabaseUrl(inject("testDatabaseSourceUrl"), runId, Number(process.env.VITEST_POOL_ID));
}
