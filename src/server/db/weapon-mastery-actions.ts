"use server";

import { revalidatePath } from "next/cache";
import { canEditPers } from "@/lib/actions/pers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  type WeaponMasteryOffer,
  findPersWeaponMasteryOffer,
  replacePersWeaponMastery,
} from "@/server/db/weapon-mastery";

type Failure = { ok: false; error: string };

async function assertCanEditPers(persId: number): Promise<{ ok: true } | Failure> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!user) return { ok: false, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(persId, user.id);
  if (!canEdit) return { ok: false, error: "Немає доступу до персонажа" };

  return { ok: true };
}

export async function loadWeaponMasteryOffer(
  persId: number,
): Promise<({ ok: true; offer: WeaponMasteryOffer }) | Failure> {
  const access = await assertCanEditPers(persId);
  if (!access.ok) return access;

  return { ok: true, offer: await findPersWeaponMasteryOffer(prisma, persId) };
}

/**
 * Вибір змінний будь-коли (рішення власника 2026-08-30): жодної привʼязки до довгого відпочинку
 * тут немає, як немає й доливання — приходить повний набір і повністю заміщає попередній.
 */
export async function saveWeaponMastery(
  persId: number,
  weaponIds: number[],
): Promise<({ ok: true; selectedWeaponIds: number[] }) | Failure> {
  const access = await assertCanEditPers(persId);
  if (!access.ok) return access;

  const offer = await findPersWeaponMasteryOffer(prisma, persId);
  if (offer.capacity === 0) return { ok: false, error: "Клас персонажа не дає майстерності зброї" };

  const selectedWeaponIds = await replacePersWeaponMastery(prisma, persId, weaponIds, offer);
  revalidatePath(`/char/${persId}`);

  return { ok: true, selectedWeaponIds };
}
