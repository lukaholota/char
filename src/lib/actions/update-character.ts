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
      ...(typeof d.alignment === "string" ? { alignment: d.alignment.slice(0, 100) } : {}),
      ...(typeof d.xp === "number" ? { xp: Math.max(0, Math.trunc(d.xp)) } : {}),
      ...(typeof d.cp === "string" ? { cp: String(Math.max(0, parseInt(d.cp) || 0)) } : {}),
      ...(typeof d.ep === "string" ? { ep: String(Math.max(0, parseInt(d.ep) || 0)) } : {}),
      ...(typeof d.sp === "string" ? { sp: String(Math.max(0, parseInt(d.sp) || 0)) } : {}),
      ...(typeof d.gp === "string" ? { gp: String(Math.max(0, parseInt(d.gp) || 0)) } : {}),
      ...(typeof d.pp === "string" ? { pp: String(Math.max(0, parseInt(d.pp) || 0)) } : {}),
    },
  });

  revalidatePath(`/pers/${payload.persId}`);
  revalidatePath(`/character/${payload.persId}`);

  return { success: true };
}
