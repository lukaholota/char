"use server";

import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import { findCombatState, saveCombatState } from "@/server/db/combat-state";
import { findUserIdByEmail } from "@/server/db/users";
import { revalidatePath } from "next/cache";

type HpMode = "damage" | "heal" | "temp";

function clampInt(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

async function assertOwnsPers(persId: number) {
  const session = await auth();
  if (!session?.user?.email) return { ok: false as const, error: "Не авторизовано" };

  const userId = await findUserIdByEmail(session.user.email);
  if (!userId) return { ok: false as const, error: "Користувача не знайдено" };

  const pers = await findCombatState(persId);

  if (!pers) return { ok: false as const, error: "Немає доступу до персонажа" };
  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) return { ok: false as const, error: "Немає доступу до персонажа" };
  return { ok: true as const, pers };
}

export async function applyHpChange({
  persId,
  mode,
  amount,
}: {
  persId: number;
  mode: HpMode;
  amount: number;
}): Promise<
  | { success: true; currentHp: number; tempHp: number; maxHp: number; deathSaveSuccesses: number; deathSaveFailures: number; isDead: boolean }
  | { success: false; error: string }
> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const amt = Math.max(0, clampInt(amount, 0));
  const curHp = Math.max(0, clampInt(owned.pers.currentHp, 0));
  const maxHp = Math.max(1, clampInt(owned.pers.maxHp, 1));
  const curTemp = Math.max(0, clampInt(owned.pers.tempHp, 0));

  let nextHp = curHp;
  let nextTemp = curTemp;

  if (mode === "damage") {
    const dmgToTemp = Math.min(nextTemp, amt);
    nextTemp -= dmgToTemp;
    const remaining = amt - dmgToTemp;
    nextHp = Math.max(0, nextHp - remaining);
  } else if (mode === "heal") {
    nextHp = Math.min(maxHp, nextHp + amt);
  } else if (mode === "temp") {
    // DnD 5e: temp HP doesn't stack; take the higher value.
    nextTemp = Math.max(nextTemp, amt);
  } else {
    return { success: false, error: "Невідомий режим" };
  }

  // If character is back above 0 HP, clear death saves and dead flag.
  const clearsDeath = nextHp > 0;

  const updated = await saveCombatState(persId, {
    currentHp: nextHp,
    tempHp: nextTemp,
    ...(clearsDeath
      ? { deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false }
      : {}),
  });

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, ...updated };
}

export async function setDeathSaves({
  persId,
  successes,
  failures,
}: {
  persId: number;
  successes: number;
  failures: number;
}): Promise<
  | { success: true; currentHp: number; deathSaveSuccesses: number; deathSaveFailures: number; isDead: boolean }
  | { success: false; error: string }
> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const nextSuccess = Math.max(0, Math.min(3, clampInt(successes, 0)));
  const nextFail = Math.max(0, Math.min(3, clampInt(failures, 0)));

  // If dead, don't auto-revive via saves.
  if (owned.pers.isDead) {
    const updated = await saveCombatState(persId, {
      deathSaveSuccesses: nextSuccess,
      deathSaveFailures: nextFail,
    });

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, ...updated };
  }

  // 3 successes => stabilize to 1 HP
  if (nextSuccess >= 3) {
    const updated = await saveCombatState(persId, {
      currentHp: 1,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      isDead: false,
    });

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, ...updated };
  }

  // 3 failures => dead
  if (nextFail >= 3) {
    const updated = await saveCombatState(persId, {
      deathSaveSuccesses: nextSuccess,
      deathSaveFailures: nextFail,
      isDead: true,
    });

    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, ...updated };
  }

  const updated = await saveCombatState(persId, {
    deathSaveSuccesses: nextSuccess,
    deathSaveFailures: nextFail,
  });

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
  return { success: true, ...updated };
}

/// Натхнення — стан, а не лічильник: його дає майстер за столом або довгий відпочинок носія
/// (`src/rules/heroic-inspiration.ts`), а витрачає гравець з листа руками.
export async function setHeroicInspiration({
  persId,
  hasHeroicInspiration,
}: {
  persId: number;
  hasHeroicInspiration: boolean;
}): Promise<{ success: true; hasHeroicInspiration: boolean } | { success: false; error: string }> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const updated = await saveCombatState(persId, { hasHeroicInspiration: hasHeroicInspiration === true });

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
  return { success: true, hasHeroicInspiration: updated.hasHeroicInspiration };
}

export async function reviveCharacter({
  persId,
}: {
  persId: number;
}): Promise<
  | { success: true; currentHp: number; deathSaveSuccesses: number; deathSaveFailures: number; isDead: boolean }
  | { success: false; error: string }
> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const updated = await saveCombatState(persId, {
    currentHp: 1,
    deathSaveSuccesses: 0,
    deathSaveFailures: 0,
    isDead: false,
  });

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
  return { success: true, ...updated };
}
export async function updateHpDirectly({
  persId,
  currentHp,
  maxHp,
}: {
  persId: number;
  currentHp: number;
  maxHp: number;
}): Promise<
  | { success: true; currentHp: number; tempHp: number; maxHp: number; deathSaveSuccesses: number; deathSaveFailures: number; isDead: boolean }
  | { success: false; error: string }
> {
  const owned = await assertOwnsPers(persId);
  if (!owned.ok) return { success: false, error: owned.error };

  const nextMax = Math.max(1, clampInt(maxHp, 1));
  const nextCur = Math.max(0, Math.min(nextMax, clampInt(currentHp, 0)));
  const clearsDeath = nextCur > 0;

  const updated = await saveCombatState(persId, {
    currentHp: nextCur,
    maxHp: nextMax,
    ...(clearsDeath
      ? { deathSaveSuccesses: 0, deathSaveFailures: 0, isDead: false }
      : {}),
  });

  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);

  return { success: true, ...updated };
}
