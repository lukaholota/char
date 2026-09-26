import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
}

// Дефолт pg закриває зʼєднання після 10 с простою, і на нашому трафіку 3 з 4 запитів
// відкривали нове: окремий процес Postgres плюс SCRAM, ~20–50 мс, майже половина часу
// в базі за тиждень (Sentry, 2026-09-25, JAVASCRIPT-NEXTJS-18/-19). `allowExitOnIdle` —
// щоб скрипти й тести без `$disconnect` не висіли ці пʼять хвилин перед виходом.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 5 * 60_000,
  allowExitOnIdle: true,
});
const adapter = new PrismaPg(pool);

// Продакшн тримає дефолтні 5 с. Тести ходять у базу через SSH-тунель і на кількох воркерах,
// де левелап зі снапшотом у 5 с не влазить (P2028) — tests/setup.ts піднімає планку.
const transactionTimeoutMs = Number(process.env.PRISMA_TRANSACTION_TIMEOUT_MS) || undefined;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ['error', 'warn'],
    transactionOptions: transactionTimeoutMs ? { timeout: transactionTimeoutMs } : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
