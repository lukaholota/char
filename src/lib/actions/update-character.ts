"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type UpdateCharacterPayload = {
  persId: number;
  data: {
    customProficiencies?: string;
    customLanguagesKnown?: string;
    personalityTraits?: string;
    ideals?: string;
    bonds?: string;
    flaws?: string;
    backstory?: string;
    notes?: string;
  };
};

export async function updateCharacterAction(payload: UpdateCharacterPayload): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.email) return { success: false, error: "Не авторизовано" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return { success: false, error: "Користувача не знайдено" };

  const pers = await prisma.pers.findUnique({
    where: { persId: payload.persId },
    select: { persId: true, userId: true },
  });
  if (!pers || pers.userId !== user.id) return { success: false, error: "Немає доступу до персонажа" };

  const d = payload.data ?? {};

  await prisma.pers.update({
    where: { persId: payload.persId },
    data: {
      ...(typeof d.customProficiencies === "string" ? { customProficiencies: d.customProficiencies } : {}),
      ...(typeof d.customLanguagesKnown === "string" ? { customLanguagesKnown: d.customLanguagesKnown } : {}),
      ...(typeof d.personalityTraits === "string" ? { personalityTraits: d.personalityTraits } : {}),
      ...(typeof d.ideals === "string" ? { ideals: d.ideals } : {}),
      ...(typeof d.bonds === "string" ? { bonds: d.bonds } : {}),
      ...(typeof d.flaws === "string" ? { flaws: d.flaws } : {}),
      ...(typeof d.backstory === "string" ? { backstory: d.backstory } : {}),
      ...(typeof d.notes === "string" ? { notes: d.notes } : {}),
    },
  });

  revalidatePath(`/pers/${payload.persId}`);
  revalidatePath(`/character/${payload.persId}`);

  return { success: true };
}
