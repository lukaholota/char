'use server';

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditPers } from "@/lib/actions/pers";
import { revalidatePath } from "next/cache";
import { findPoolsAfterSetting, serializeHitDicePools, type HitDiceSpend } from "@/rules/hit-dice";
import {
  collectHitDicePools,
  findRestPers,
  takeLongRest,
  takeShortRest,
  type LongRestError,
  type LongRestResult,
  type ShortRestError,
  type ShortRestResult,
} from "@/server/db/rest";

export type { HitDiceToUse, LongRestError, LongRestResult, ShortRestError, ShortRestResult } from "@/server/db/rest";

async function assertOwnsPers(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { ok: false as const, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return { ok: false as const, error: "Користувача не знайдено" };

  const pers = await findRestPers(persId);

  if (!pers) return { ok: false as const, error: "Немає доступу до персонажа" };
  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) return { ok: false as const, error: "Немає доступу до персонажа" };

  return { ok: true as const, pers };
}

function revalidateSheet(persId: number) {
  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
}

export async function shortRest(
  persId: number,
  hitDiceToUse: HitDiceSpend[],
  rolledHitPoints?: number
): Promise<ShortRestResult | ShortRestError> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const result = await takeShortRest(owned.pers, hitDiceToUse, rolledHitPoints);
  if (result.success) revalidateSheet(persId);
  return result;
}

export async function longRest(persId: number): Promise<LongRestResult | LongRestError> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const result = await takeLongRest(owned.pers);
  revalidateSheet(persId);
  return result;
}

/**
 * Get hit dice info for a character (for display purposes)
 */
export async function getHitDiceInfo(persId: number): Promise<{
  success: true;
  hitDice: Array<{
    classId: number;
    className: string;
    hitDie: number;
    current: number;
    max: number;
  }>;
} | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };
  
  const hitDicePools = collectHitDicePools(owned.pers);

  const classes = await prisma.class.findMany({
    where: { classId: { in: hitDicePools.map((pool) => pool.classId) } },
    select: { classId: true, name: true },
  });
  const classNameMap = new Map(classes.map((entry) => [entry.classId, entry.name]));

  const hitDice = hitDicePools.map((pool) => ({
    classId: pool.classId,
    className: classNameMap.get(pool.classId) ?? "Невідомий",
    hitDie: pool.hitDie,
    current: pool.current,
    max: pool.max,
  }));

  return { success: true, hitDice };
}

/**
 * Ручна правка кубиків здоровʼя: скільки лишилось у кожному класі.
 * Витрачений вживу кубик має відніматись без відпочинку й без лікування.
 */
export async function setHitDice(
  persId: number,
  remainingByClass: Record<number, number>
): Promise<{ success: true; currentHitDice: Record<number, number> } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const updated = findPoolsAfterSetting(collectHitDicePools(owned.pers), remainingByClass);
  if (!updated.ok) return { success: false, error: updated.error };

  const currentHitDice = serializeHitDicePools(updated.pools);

  try {
    await prisma.pers.update({
      where: { persId },
      data: { currentHitDice: currentHitDice as object },
    });

    revalidateSheet(persId);

    return { success: true, currentHitDice };
  } catch (error) {
    console.error("Error updating hit dice:", error);
    return { success: false, error: "Помилка при збереженні кубиків здоровʼя" };
  }
}
