"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { calculateCasterLevel } from "../logic/spell-logic";
import { SPELL_SLOT_PROGRESSION } from "../refs/static";

async function assertOwnsPers(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { ok: false as const, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) return { ok: false as const, error: "Користувача не знайдено" };

  const pers = await prisma.pers.findUnique({
    where: { persId },
    select: {
      persId: true,
      userId: true,
      currentSpellSlots: true,
      currentPactSlots: true,
    },
  });

  if (!pers || pers.userId !== user.id) {
    return { ok: false as const, error: "Немає доступу до персонажа" };
  }

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
    return { success: false, error: "Некоректний рівень комірки" };
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

  const updated = await prisma.pers.update({
    where: { persId },
    data: { currentSpellSlots: next },
    select: { currentSpellSlots: true },
  });

  revalidatePath(`/pers/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, currentSpellSlots: updated.currentSpellSlots as number[] };
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

  const updated = await prisma.pers.update({
    where: { persId },
    data: { currentPactSlots: cur - 1 },
    select: { currentPactSlots: true },
  });

  revalidatePath(`/pers/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, currentPactSlots: updated.currentPactSlots };
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
    return { success: false, error: "Некоректний рівень комірки" };
  }

  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  // Need full data for max slots calculation
  const persWithClass = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: true,
      subclass: true,
      multiclasses: {
        include: {
          class: true,
          subclass: true,
        },
      },
    },
  });

  if (!persWithClass) return { success: false, error: "Персонажа не знайдено" };

  const caster = calculateCasterLevel(persWithClass as any);
  const casterLevel = Math.max(0, Math.min(20, Math.trunc(caster.casterLevel || 0)));
  const row = (SPELL_SLOT_PROGRESSION as any).FULL?.[casterLevel] as number[] | undefined;
  const max = row ? (row[level - 1] ?? 0) : 0;

  const raw = Array.isArray(persWithClass.currentSpellSlots) ? (persWithClass.currentSpellSlots as number[]) : [];
  const next = Array.from({ length: 9 }, (_, idx) => {
    const v = raw[idx];
    return Number.isFinite(v) ? Math.max(0, Math.trunc(v)) : 0;
  });

  const idx = level - 1;
  if (next[idx] >= max) {
    return { success: true, currentSpellSlots: next };
  }

  next[idx] = next[idx] + 1;

  const updated = await prisma.pers.update({
    where: { persId },
    data: { currentSpellSlots: next },
    select: { currentSpellSlots: true },
  });

  revalidatePath(`/pers/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, currentSpellSlots: updated.currentSpellSlots as number[] };
}

/**
 * Increment Warlock Pact Magic slots.
 */
export async function restorePactSlot(
  persId: number
): Promise<{ success: true; currentPactSlots: number } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const persWithClass = await prisma.pers.findUnique({
    where: { persId },
    include: {
      class: true,
      subclass: true,
      multiclasses: {
        include: {
          class: true,
          subclass: true,
        },
      },
    },
  });

  if (!persWithClass) return { success: false, error: "Персонажа не знайдено" };

  const caster = calculateCasterLevel(persWithClass as any);
  const pactLevel = Math.max(0, Math.min(20, Math.trunc(caster.pactLevel || 0)));
  const pactRow = (SPELL_SLOT_PROGRESSION as any).PACT?.[pactLevel] as { slots: number; level: number } | undefined;
  const max = pactRow ? pactRow.slots : 0;

  const cur = Number.isFinite(persWithClass.currentPactSlots)
    ? Math.max(0, Math.trunc(persWithClass.currentPactSlots))
    : 0;

  if (cur >= max) {
    return { success: true, currentPactSlots: cur };
  }

  const updated = await prisma.pers.update({
    where: { persId },
    data: { currentPactSlots: cur + 1 },
    select: { currentPactSlots: true },
  });

  revalidatePath(`/pers/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, currentPactSlots: updated.currentPactSlots };
}
