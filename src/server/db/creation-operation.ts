import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreateCharacterResult } from "./character-creation";

export type CreationOperationKind = { idPrefix: string; kind: string };
export type CreationRequest = { userId: number; requestId: string };

const REPLAY_REFUSED = "Не вдалося повторити створення персонажа.";

function buildOperationId(operation: CreationOperationKind, requestId: string): string {
  return `${operation.idPrefix}-${requestId}`;
}

export async function findCreationOperationResult(
  client: PrismaClient | Prisma.TransactionClient,
  operation: CreationOperationKind,
  request: CreationRequest,
): Promise<CreateCharacterResult | null> {
  const stored = await client.pers_offline_operation.findUnique({
    where: { operation_id: buildOperationId(operation, request.requestId) },
    select: { user_id: true, operation_kind: true, pers_id: true, pers: { select: { userId: true } } },
  });
  if (!stored) return null;
  if (stored.user_id !== request.userId || stored.pers.userId !== request.userId || stored.operation_kind !== operation.kind) {
    return { error: REPLAY_REFUSED };
  }
  return { success: true, persId: stored.pers_id };
}

export async function lockCreationOperation(tx: Prisma.TransactionClient, operation: CreationOperationKind, requestId: string): Promise<void> {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${buildOperationId(operation, requestId)}, 0))`;
}

export async function saveCreationOperation(
  tx: Prisma.TransactionClient,
  operation: CreationOperationKind,
  request: CreationRequest & { persId: number },
): Promise<void> {
  await tx.pers_offline_operation.create({
    data: { operation_id: buildOperationId(operation, request.requestId), operation_kind: operation.kind, user_id: request.userId, pers_id: request.persId },
  });
}
