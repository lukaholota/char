"use server";

import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import { revalidatePath } from "next/cache";
import { calculateCasterLevel } from "../logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "../refs/static";
import {
  findSpellcastingSlotState,
  findSpellSlotOwnership,
  updateCurrentPactSlots,
  updateCurrentSpellSlots,
} from "@/server/db/spell-slots";
import { findUserIdByEmail } from "@/server/db/users";

async function assertOwnsPers(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { ok: false as const, error: "Не авторизовано" };

  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null) return { ok: false as const, error: "Користувача не знайдено" };

  const pers = await findSpellSlotOwnership(persId);

  if (!pers) return { ok: false as const, error: "Немає доступу до персонажа" };
  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) return { ok: false as const, error: "Немає доступу до персонажа" };

  return { ok: true as const, pers };
}

/**
 * Decrement a standard spell slot of given level (1..9).
 * Updates Pers.currentSpellSlots in DB.
 */
export async function spendSpellSlot(
  persId: number,
  slotLevel: number
): Promise<{ success: true; currentSpellSlots: number[] } | { success: false; error: string }> {
  const level = Math.trunc(Number(slotLevel));
  if (!Number.isFinite(level) || level < 1 || level > 9) {
    return { success: false, error: "Некоректний рівень слота" };
  }

  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const raw = Array.isArray(owned.pers.currentSpellSlots) ? owned.pers.currentSpellSlots : [];
  const next = Array.from({ length: 9 }, (_, idx) => {
    const v = raw[idx];
    return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
  });

  const idx = level - 1;
  if ((next[idx] ?? 0) <= 0) {
    return { success: true, currentSpellSlots: next };
  }

  next[idx] = Math.max(0, (next[idx] ?? 0) - 1);

  const updated = await updateCurrentSpellSlots(persId, next);

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, currentSpellSlots: updated };
}

/**
 * Decrement Warlock Pact Magic slots (stored separately in Pers.currentPactSlots).
 */
export async function spendPactSlot(
  persId: number
): Promise<{ success: true; currentPactSlots: number } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const cur = Number.isFinite(owned.pers.currentPactSlots)
    ? Math.max(0, Math.trunc(owned.pers.currentPactSlots))
    : 0;

  if (cur <= 0) {
    return { success: true, currentPactSlots: cur };
  }

  const updated = await updateCurrentPactSlots(persId, cur - 1);

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, currentPactSlots: updated };
}

/**
 * Increment a standard spell slot of given level (1..9).
 */
export async function restoreSpellSlot(
  persId: number,
  slotLevel: number
): Promise<{ success: true; currentSpellSlots: number[] } | { success: false; error: string }> {
  const level = Math.trunc(Number(slotLevel));
  if (!Number.isFinite(level) || level < 1 || level > 9) {
    return { success: false, error: "Некоректний рівень слота" };
  }

  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  // Need full data for max slots calculation
  const persWithClass = await findSpellcastingSlotState(persId);

  if (!persWithClass) return { success: false, error: "Персонажа не знайдено" };

  const caster = calculateCasterLevel(persWithClass);
  const casterLevel = Math.max(0, Math.min(20, Math.trunc(caster.casterLevel || 0)));
  const row = (SPELL_SLOT_PROGRESSION as any).FULL?.[casterLevel] as number[] | undefined;
  const max = row ? (row[level - 1] ?? 0) : 0;

  const raw = Array.isArray(persWithClass.currentSpellSlots) ? persWithClass.currentSpellSlots : [];
  const next = Array.from({ length: 9 }, (_, idx) => {
    const v = raw[idx];
    return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
  });

  const idx = level - 1;
  if (next[idx] >= max) {
    return { success: true, currentSpellSlots: next };
  }

  next[idx] = next[idx] + 1;

  const updated = await updateCurrentSpellSlots(persId, next);

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, currentSpellSlots: updated };
}

/**
 * Increment Warlock Pact Magic slots.
 */
export async function restorePactSlot(
  persId: number
): Promise<{ success: true; currentPactSlots: number } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const persWithClass = await findSpellcastingSlotState(persId);

  if (!persWithClass) return { success: false, error: "Персонажа не знайдено" };

  const caster = calculateCasterLevel(persWithClass);
  const pactLevel = Math.max(0, Math.min(20, Math.trunc(caster.pactLevel || 0)));
  const pactRow = (SPELL_SLOT_PROGRESSION as any).PACT?.[pactLevel] as { slots: number; level: number } | undefined;
  const max = pactRow ? pactRow.slots : 0;

  const cur = Number.isFinite(persWithClass.currentPactSlots)
    ? Math.max(0, Math.trunc(persWithClass.currentPactSlots))
    : 0;

  if (cur >= max) {
    return { success: true, currentPactSlots: cur };
  }

  const updated = await updateCurrentPactSlots(persId, cur + 1);

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, currentPactSlots: updated };
}
