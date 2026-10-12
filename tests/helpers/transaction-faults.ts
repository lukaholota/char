import { vi } from "vitest";
import { prisma } from "@/lib/prisma";

export function failAfterCommitOnce() {
  const runTransaction = prisma.$transaction.bind(prisma);
  return vi.spyOn(prisma, "$transaction").mockImplementationOnce((async (callback: unknown, options?: unknown) => {
    await runTransaction(callback as never, options as never);
    throw new Error("Injected connection loss after commit");
  }) as never);
}

export function failBeforeCommitOnce() {
  const runTransaction = prisma.$transaction.bind(prisma);
  return vi.spyOn(prisma, "$transaction").mockImplementationOnce((async (callback: unknown, options?: unknown) => runTransaction(async (tx) => {
    if (typeof callback !== "function") throw new TypeError("Expected interactive transaction");
    await callback(tx);
    throw new Error("Injected failure immediately before commit");
  }, options as never)) as never);
}
