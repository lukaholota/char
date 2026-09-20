import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { canEditPers } from "@/lib/actions/pers";

export async function findEditDenial(persId: number): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return "Не авторизовано";

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });
  if (!user) return "Користувача не знайдено";

  const canEdit = await canEditPers(persId, user.id);
  return canEdit ? null : "Немає доступу до персонажа";
}

export function revalidatePers(persId: number) {
  revalidatePath(`/char/${persId}`);
  revalidatePath(`/character/${persId}`);
}
