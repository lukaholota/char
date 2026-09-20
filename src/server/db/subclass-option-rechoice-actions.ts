"use server";

import { revalidatePath } from "next/cache";
import { canEditPers } from "@/lib/actions/pers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  loadSubclassOptionRechoiceOffers,
  replaceSubclassChoiceOption,
  type ReplaceSubclassOptionResult,
  type SubclassOptionRechoiceOffer,
} from "@/server/db/subclass-option-rechoice";

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

export async function loadSubclassOptionRechoice(
  persId: number,
  groupName: string,
): Promise<({ ok: true; offer: SubclassOptionRechoiceOffer }) | Failure> {
  const access = await assertCanEditPers(persId);
  if (!access.ok) return access;

  const offer = (await loadSubclassOptionRechoiceOffers(prisma, persId)).find((candidate) => candidate.group.groupName === groupName);
  return offer ? { ok: true, offer } : { ok: false, error: "Цей вибір не перевибирається" };
}

export async function saveSubclassOptionRechoice(
  persId: number,
  input: { groupName: string; toOptionId: number },
): Promise<ReplaceSubclassOptionResult> {
  const access = await assertCanEditPers(persId);
  if (!access.ok) return access;

  const result = await replaceSubclassChoiceOption(prisma, { persId, ...input });
  if (result.ok && result.changed) {
    revalidatePath(`/char/${persId}`);
    revalidatePath(`/character/${persId}`);
  }
  return result;
}
