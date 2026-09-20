import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { calculateCasterLevel } from "@/lib/logic/spell-logic";
import {
  applyOfflineOperation,
  normalizeHitDice,
  normalizePersDetails,
  type OfflineHitDiceSpend,
  type OfflineOperation,
  type OfflinePersState,
} from "@/lib/offline/operations";
import { SPELL_SLOT_PROGRESSION } from "@/lib/refs/static";
import { buildHitDicePools, findMainClassLevel, findPoolsAfterSetting, serializeHitDicePools, type StoredHitDice } from "@/rules/hit-dice";
import { applyChargesStep } from "@/rules/magic-item-charges";
import { getPactMagicSlots, getStandardSpellSlots } from "@/rules/spellcasting";
import { changeFeatureUses } from "@/server/db/feature-use-change";
import { changeFeatureState } from "@/server/db/feature-state-change";
import { changeConcentration, changeExhaustion, changeSpellBuff, type PersEffectResult } from "@/server/db/pers-effect-change";
import { findMagicItemPersId, findPersMagicItemCharges, savePersMagicItemCharges } from "@/server/db/magic-items";
import { updateSheetSpellRow } from "@/server/db/sheet-spell-rows";
import { findRestPers, takeLongRest, takeShortRest } from "@/server/db/rest";
import { findSpellcastingSlotState } from "@/server/db/spell-slots";

export type ApplyOfflineOperationResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; error: string; retry: boolean };

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
  heroicInspirationCount: true,
  canStackHeroicInspiration: true,
} satisfies Prisma.PersSelect;

const HIT_DICE_PERS_SELECT = {
  level: true,
  currentHitDice: true,
  class: { select: { classId: true, hitDie: true } },
  multiclasses: { select: { classId: true, classLevel: true, class: { select: { hitDie: true } } } },
} satisfies Prisma.PersSelect;

const NO_SLOT_MAXIMA: Pick<OfflinePersState, "maxSpellSlots" | "maxPactSlots"> = { maxSpellSlots: [], maxPactSlots: 0 };

function isSlotRestore(operation: OfflineOperation): boolean {
  return operation.kind === "restore-spell-slot" || operation.kind === "restore-pact-slot";
}

function normalizeOperation(operation: OfflineOperation): OfflineOperation {
  return operation.kind === "details"
    ? { ...operation, patch: normalizePersDetails(operation.patch) }
    : operation;
}

function isPersFieldOperation(operation: OfflineOperation): boolean {
  switch (operation.kind) {
    case "feature-use":
    case "feature-state":
    case "concentration":
    case "spell-buff":
    case "exhaustion":
    case "magic-item-charges":
    case "spell-prepared":
    case "hit-dice":
    case "short-rest":
    case "long-rest":
      return false;
    default:
      return true;
  }
}

export async function applyOwnedOfflineOperation(
  userId: number,
  input: OfflineOperation,
): Promise<ApplyOfflineOperationResult> {
  const operation = normalizeOperation(input);

  const pers = await prisma.pers.findFirst({
    where: { persId: operation.persId, userId, isSnapshot: false },
    select: OFFLINE_PERS_SELECT,
  });
  if (!pers) return { ok: false, error: "Офлайн-зміни дозволені лише власнику персонажа", retry: false };

  if (isPersFieldOperation(operation)) return applyPersFieldOperation(userId, operation);
  return applyRelationOperation(userId, operation);
}

/// Поля `pers`: відмітка про операцію й сам запис ідуть однією транзакцією — друга відправка
/// впирається в первинний ключ і не виконується.
async function applyPersFieldOperation(userId: number, operation: OfflineOperation): Promise<ApplyOfflineOperationResult> {
  return prisma.$transaction(async (tx) => {
    const pers = await tx.pers.findUniqueOrThrow({ where: { persId: operation.persId }, select: OFFLINE_PERS_SELECT });
    const claimed = await claimOperation(tx, userId, operation);
    if (!claimed) return { ok: true, duplicate: true };

    const maxima = isSlotRestore(operation) ? await findSpellSlotMaxima(operation.persId) : NO_SLOT_MAXIMA;
    const next = applyOfflineOperation({ ...pers, ...maxima }, operation);
    await tx.pers.update({ where: { persId: operation.persId }, data: buildPersUpdate(operation, next) });

    return { ok: true, duplicate: false };
  });
}

/// Ресурси рис, заряди, підготовка, хіт-дайси й відпочинок живуть в інших таблицях і мають власні
/// транзакції, тож відмітка ставиться першою, а на збої знімається — операція лишається в черзі
/// клієнта й приїде ще раз.
async function applyRelationOperation(userId: number, operation: OfflineOperation): Promise<ApplyOfflineOperationResult> {
  const claimed = await claimOperation(prisma, userId, operation);
  if (!claimed) return { ok: true, duplicate: true };

  try {
    const outcome = await applyRelationChange(operation);
    if (outcome !== null) {
      await releaseOperation(operation);
      return { ok: false, error: outcome, retry: false };
    }
    return { ok: true, duplicate: false };
  } catch (error) {
    await releaseOperation(operation);
    return { ok: false, error: error instanceof Error ? error.message : "Не вдалося застосувати операцію", retry: true };
  }
}

async function applyRelationChange(operation: OfflineOperation): Promise<string | null> {
  switch (operation.kind) {
    case "feature-use": {
      const result = await changeFeatureUses({ persId: operation.persId, featureId: operation.featureId }, operation.direction);
      return result.success ? null : result.error;
    }
    case "feature-state": {
      const result = await changeFeatureState({ persId: operation.persId, featureId: operation.featureId }, operation.isActive);
      return result.success ? null : result.error;
    }
    case "concentration":
      return describeFailure(await changeConcentration(operation.persId, operation.spellId));
    case "spell-buff":
      return describeFailure(await changeSpellBuff(operation.persId, operation));
    case "exhaustion":
      return describeFailure(await changeExhaustion(operation.persId, operation.level));
    case "magic-item-charges": {
      const ownerId = await findMagicItemPersId(operation.persMagicItemId);
      if (ownerId !== operation.persId) return "Предмет не належить цьому персонажу";
      const charges = await findPersMagicItemCharges(operation.persMagicItemId);
      if (!charges) return "Предмет не знайдено";
      await savePersMagicItemCharges(operation.persMagicItemId, applyChargesStep(charges, Math.trunc(operation.step)));
      return null;
    }
    case "spell-prepared":
      await updateSheetSpellRow(operation.persId, operation.spellId, { isPrepared: operation.isPrepared });
      return null;
    case "hit-dice":
      return saveHitDiceSetting(operation.persId, normalizeHitDice(operation.remainingByClass));
    case "short-rest":
      return replayShortRest(operation.persId, operation.hitDiceSpent, operation.restoredHitPoints);
    case "long-rest":
      return replayLongRest(operation.persId);
    default:
      return "Невідома операція";
  }
}

async function saveHitDiceSetting(persId: number, remainingByClass: Record<string, number>): Promise<string | null> {
  const pers = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: HIT_DICE_PERS_SELECT });
  const classes = [
    { classId: pers.class.classId, hitDie: pers.class.hitDie, classLevel: findMainClassLevel(pers.level, pers.multiclasses) },
    ...pers.multiclasses.map((multiclass) => ({
      classId: multiclass.classId,
      hitDie: multiclass.class.hitDie,
      classLevel: multiclass.classLevel,
    })),
  ];
  const pools = buildHitDicePools(classes, pers.currentHitDice as StoredHitDice);
  const updated = findPoolsAfterSetting(pools, toClassIdRecord(remainingByClass));
  if (!updated.ok) return updated.error;

  await prisma.pers.update({ where: { persId }, data: { currentHitDice: serializeHitDicePools(updated.pools) as object } });
  return null;
}

async function replayShortRest(persId: number, hitDiceSpent: OfflineHitDiceSpend[], restoredHitPoints: number): Promise<string | null> {
  const pers = await findRestPers(persId);
  if (!pers) return "Персонажа не знайдено";
  const result = await takeShortRest(pers, hitDiceSpent, restoredHitPoints);
  return result.success ? null : result.error;
}

async function replayLongRest(persId: number): Promise<string | null> {
  const pers = await findRestPers(persId);
  if (!pers) return "Персонажа не знайдено";
  await takeLongRest(pers);
  return null;
}

function toClassIdRecord(remainingByClass: Record<string, number>): Record<number, number> {
  const record: Record<number, number> = {};
  for (const [classId, remaining] of Object.entries(remainingByClass)) record[Number(classId)] = remaining;
  return record;
}

async function claimOperation(
  client: Prisma.TransactionClient | typeof prisma,
  userId: number,
  operation: OfflineOperation,
): Promise<boolean> {
  const claimed = await client.pers_offline_operation.createMany({
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
  return claimed.count > 0;
}

async function releaseOperation(operation: OfflineOperation): Promise<void> {
  await prisma.pers_offline_operation.deleteMany({ where: { operation_id: operation.operationId } });
}

async function findSpellSlotMaxima(persId: number): Promise<Pick<OfflinePersState, "maxSpellSlots" | "maxPactSlots">> {
  const state = await findSpellcastingSlotState(persId);
  if (!state) return { maxSpellSlots: [], maxPactSlots: 0 };

  const caster = calculateCasterLevel(state);
  return {
    maxSpellSlots: getStandardSpellSlots(caster.casterLevel, SPELL_SLOT_PROGRESSION.FULL),
    maxPactSlots: getPactMagicSlots(caster.pactLevel, SPELL_SLOT_PROGRESSION.PACT)?.slots ?? 0,
  };
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
    case "restore-spell-slot":
      return { currentSpellSlots: next.currentSpellSlots };
    case "spend-pact-slot":
    case "restore-pact-slot":
      return { currentPactSlots: next.currentPactSlots };
    case "heroic-inspiration":
      return { heroicInspirationCount: next.heroicInspirationCount };
    default:
      return {};
  }
}

function describeFailure(result: PersEffectResult): string | null {
  return result.success ? null : result.error;
}
