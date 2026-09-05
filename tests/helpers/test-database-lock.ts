import { mkdirSync, rmSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Той самий замок, що й у scripts/with-test-db-lock.sh, тільки з боку vitest.
 *
 * Каталог, імена змінних і правила протухання мусять збігатися зі скриптом **дослівно**:
 * два різні замки не бачили б один одного, і межі не було б узагалі. Скрипт лишається для
 * `bun run`, цей модуль закриває прямий `bunx vitest --config vitest.integration.config.mts`,
 * якого скрипт не бачить — саме через це 2026-09-01 два повні прогони дали сотню фальшивих
 * падінь на чужому `TRUNCATE`.
 */

const CLAIM_GRACE_SECONDS = 10;

function findLockDirectory(): string {
  return process.env.TEST_DB_LOCK_DIR || join(process.env.TMPDIR || "/tmp", "spells-test-db.lock");
}

function findWaitTimeoutSeconds(): number {
  return Number(process.env.TEST_DB_LOCK_TIMEOUT || 1800);
}

function findStaleSeconds(): number {
  return Number(process.env.TEST_DB_LOCK_STALE || 1800);
}

function findLockAgeSeconds(lockDir: string): number {
  try {
    return Math.floor((Date.now() - statSync(lockDir).mtimeMs) / 1000);
  } catch {
    return 0;
  }
}

function readHoldingPid(lockDir: string): number | null {
  try {
    const pid = Number(readFileSync(join(lockDir, "pid"), "utf8").trim());
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
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

function isLockAlive(lockDir: string): boolean {
  const age = findLockAgeSeconds(lockDir);
  const pid = readHoldingPid(lockDir);

  // Щойно створена тека ще не встигла отримати pid — це не покинутий замок.
  if (pid === null) return age < CLAIM_GRACE_SECONDS;

  return isProcessAlive(pid) && age < findStaleSeconds();
}

function claimLockDirectory(lockDir: string): boolean {
  try {
    mkdirSync(lockDir);
    writeFileSync(join(lockDir, "pid"), `${process.pid}\n`);
    return true;
  } catch {
    return false;
  }
}

function sleepSeconds(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export async function acquireTestDatabaseLock(): Promise<() => void> {
  if (process.env.TEST_DB_LOCK_HELD) return () => {};

  const lockDir = findLockDirectory();
  const waitTimeout = findWaitTimeoutSeconds();
  let waited = 0;
  let announced = false;

  while (!claimLockDirectory(lockDir)) {
    if (!isLockAlive(lockDir)) {
      rmSync(lockDir, { recursive: true, force: true });
      continue;
    }
    if (!announced) {
      console.error(`⏳ чекаю на spells_test — тести вже крутить pid ${readHoldingPid(lockDir)}`);
      announced = true;
    }
    if (waited >= waitTimeout) {
      throw new Error(`✖ не дочекався замка на spells_test за ${waitTimeout}с: ${lockDir}`);
    }
    await sleepSeconds(2);
    waited += 2;
  }

  process.env.TEST_DB_LOCK_HELD = "1";

  return () => {
    rmSync(lockDir, { recursive: true, force: true });
    delete process.env.TEST_DB_LOCK_HELD;
  };
}
