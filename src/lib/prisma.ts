import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
