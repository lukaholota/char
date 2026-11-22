"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import { findUserIdByEmail } from "@/server/db/users";
import { savePersHouseRules } from "@/server/db/pers-house-rules";

export async function savePersHouseRulesAction(persId: number, rules: unknown): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  const userId = session?.user?.email ? await findUserIdByEmail(session.user.email) : null;
  if (!userId) return { success: false, error: "Не авторизовано" };
  if (!Number.isInteger(persId) || !(await canEditPers(persId, userId))) return { success: false, error: "Немає доступу до персонажа" };
  await savePersHouseRules(persId, rules);
  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
  return { success: true };
}
