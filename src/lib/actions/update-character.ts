"use server";

import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import { revalidatePath } from "next/cache";
import { normalizePersDetails } from "@/lib/offline/operations";
import { updatePersDetails } from "@/server/db/pers-details";
import { findUserIdByEmail } from "@/server/db/users";

export type UpdateCharacterPayload = {
  persId: number;
  data: {
    customProficiencies?: string;
    customLanguagesKnown?: string;
    customEquipment?: string;
    personalityTraits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    backstory?: string;
    notes?: string;
    alignment?: string;
    xp?: number;
    cp?: string;
    ep?: string;
    sp?: string;
    gp?: string;
    pp?: string;
  };
};

export async function updateCharacterAction(payload: UpdateCharacterPayload): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null) return { success: false, error: "Користувача не знайдено" };

  const canEdit = await canEditPers(payload.persId, userId);
  if (!canEdit) return { success: false, error: "Немає доступу до персонажа" };

  const update = normalizePersDetails(payload.data ?? {});
  await updatePersDetails(payload.persId, update);

  revalidatePath(`/char/${payload.persId}`);
  revalidatePath(`/character/${payload.persId}`);

  return { success: true };
}
