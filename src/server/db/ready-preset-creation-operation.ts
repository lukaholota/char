import type { Prisma, PrismaClient } from "@prisma/client";
import type { CreateCharacterResult } from "./character-creation";
import { findCreationOperationResult, lockCreationOperation, saveCreationOperation, type CreationOperationKind, type CreationRequest } from "./creation-operation";

const READY_PRESET_OPERATION: CreationOperationKind = { idPrefix: "ready-preset-create", kind: "ready_preset_create" };

export async function findReadyPresetCreationResult(client: PrismaClient | Prisma.TransactionClient, request: CreationRequest): Promise<CreateCharacterResult | null> {
  return findCreationOperationResult(client, READY_PRESET_OPERATION, request);
}

export async function lockReadyPresetCreation(tx: Prisma.TransactionClient, requestId: string): Promise<void> {
  await lockCreationOperation(tx, READY_PRESET_OPERATION, requestId);
}

export async function saveReadyPresetCreationOperation(tx: Prisma.TransactionClient, request: CreationRequest & { persId: number }): Promise<void> {
  await saveCreationOperation(tx, READY_PRESET_OPERATION, request);
}
