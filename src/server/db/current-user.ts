import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function findCurrentUserId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  return user?.id ?? null;
}
