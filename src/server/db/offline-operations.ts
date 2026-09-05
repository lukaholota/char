import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  applyOfflineOperation,
  normalizePersDetails,
  type OfflineOperation,
  type OfflinePersState,
} from "@/lib/offline/operations";

export type ApplyOfflineOperationResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; error: string };

const OFFLINE_PERS_SELECT = {
  persId: true,
  currentHp: true,
  maxHp: true,
  tempHp: true,
  deathSaveSuccesses: true,
  deathSaveFailures: true,
  isDead: true,
  currentSpellSlots: true,
  currentPactSlots: true,
} satisfies Prisma.PersSelect;

function normalizeOperation(operation: OfflineOperation): OfflineOperation {
  return operation.kind === "details"
    ? { ...operation, patch: normalizePersDetails(operation.patch) }
    : operation;
}

export async function applyOwnedOfflineOperation(
  userId: number,
  input: OfflineOperation,
): Promise<ApplyOfflineOperationResult> {
  const operation = normalizeOperation(input);

  return prisma.$transaction(async (tx) => {
    const pers = await tx.pers.findFirst({
      where: { persId: operation.persId, userId, isSnapshot: false },
      select: OFFLINE_PERS_SELECT,
    });
    if (!pers) return { ok: false, error: "Офлайн-зміни дозволені лише власнику персонажа" };

    const claimed = await tx.pers_offline_operation.createMany({
      data: [
        {
          operation_id: operation.operationId,
          pers_id: operation.persId,
          user_id: userId,
          operation_kind: operation.kind,
        },
      ],
      skipDuplicates: true,
    });
    if (claimed.count === 0) return { ok: true, duplicate: true };

    const next = applyOfflineOperation(pers, operation);
    await tx.pers.update({
      where: { persId: operation.persId },
      data: buildPersUpdate(operation, next),
    });

    return { ok: true, duplicate: false };
  });
}

function buildPersUpdate(operation: OfflineOperation, next: OfflinePersState): Prisma.PersUpdateInput {
  switch (operation.kind) {
    case "details":
      return operation.patch;
    case "hp":
      return {
        currentHp: next.currentHp,
        tempHp: next.tempHp,
        deathSaveSuccesses: next.deathSaveSuccesses,
        deathSaveFailures: next.deathSaveFailures,
        isDead: next.isDead,
      };
    case "death-saves":
      return {
        currentHp: next.currentHp,
        deathSaveSuccesses: next.deathSaveSuccesses,
        deathSaveFailures: next.deathSaveFailures,
        isDead: next.isDead,
      };
    case "spend-spell-slot":
      return { currentSpellSlots: next.currentSpellSlots };
    case "spend-pact-slot":
      return { currentPactSlots: next.currentPactSlots };
  }
}
