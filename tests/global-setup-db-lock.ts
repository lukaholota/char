import { acquireTestDatabaseLock } from "./helpers/test-database-lock";

/**
 * Тільки для vitest.integration.config.mts. `globalSetup` — єдиний гак, що спрацьовує один
 * раз на весь прогін, у головному процесі; `setupFiles` виконався б для кожного з 49 файлів
 * і лишав би вікно між ними. У юніт-конфізі цього гака немає навмисно: після Р32 той набір
 * бази не торкається, і серіалізувати його нема за чим.
 */

let releaseLock: (() => void) | null = null;

export async function setup(): Promise<void> {
  releaseLock = await acquireTestDatabaseLock();
}

export async function teardown(): Promise<void> {
  releaseLock?.();
  releaseLock = null;
}
