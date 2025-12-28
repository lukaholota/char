"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
      currentHp: true,
      maxHp: true,
      tempHp: true,
      deathSaveSuccesses: true,
      deathSaveFailures: true,
      isDead: true,
    },
  });

  if (!pers || pers.userId !== user.id) return { ok: false as const, error: "Немає доступу до персонажа" };
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

  const updated = await prisma.pers.update({
    where: { persId },
    data: {
      currentHp: nextHp,
      tempHp: nextTemp,
      ...(clearsDeath
        ? {
            deathSaveSuccesses: 0,
            deathSaveFailures: 0,
            isDead: false,
          }
        : {}),
    },
    select: {
      currentHp: true,
      tempHp: true,
      maxHp: true,
      deathSaveSuccesses: true,
      deathSaveFailures: true,
      isDead: true,
    },
  });

  revalidatePath(`/pers/${persId}`);
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
    const updated = await prisma.pers.update({
      where: { persId },
      data: {
        deathSaveSuccesses: nextSuccess,
        deathSaveFailures: nextFail,
      },
      select: { currentHp: true, deathSaveSuccesses: true, deathSaveFailures: true, isDead: true },
    });

    revalidatePath(`/pers/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, ...updated };
  }

  // 3 successes => stabilize to 1 HP
  if (nextSuccess >= 3) {
    const updated = await prisma.pers.update({
      where: { persId },
      data: {
        currentHp: 1,
        deathSaveSuccesses: 0,
        deathSaveFailures: 0,
        isDead: false,
      },
      select: { currentHp: true, deathSaveSuccesses: true, deathSaveFailures: true, isDead: true },
    });

    revalidatePath(`/pers/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, ...updated };
  }

  // 3 failures => dead
  if (nextFail >= 3) {
    const updated = await prisma.pers.update({
      where: { persId },
      data: {
        deathSaveSuccesses: nextSuccess,
        deathSaveFailures: nextFail,
        isDead: true,
      },
      select: { currentHp: true, deathSaveSuccesses: true, deathSaveFailures: true, isDead: true },
    });

    revalidatePath(`/pers/${persId}`);
    revalidatePath(`/character/${persId}`);
    return { success: true, ...updated };
  }

  const updated = await prisma.pers.update({
    where: { persId },
    data: {
      deathSaveSuccesses: nextSuccess,
      deathSaveFailures: nextFail,
    },
    select: { currentHp: true, deathSaveSuccesses: true, deathSaveFailures: true, isDead: true },
  });

  revalidatePath(`/pers/${persId}`);
  revalidatePath(`/character/${persId}`);
  return { success: true, ...updated };
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

  const updated = await prisma.pers.update({
    where: { persId },
    data: {
      currentHp: 1,
      deathSaveSuccesses: 0,
      deathSaveFailures: 0,
      isDead: false,
    },
    select: { currentHp: true, deathSaveSuccesses: true, deathSaveFailures: true, isDead: true },
  });

  revalidatePath(`/pers/${persId}`);
  revalidatePath(`/character/${persId}`);
  return { success: true, ...updated };
}
