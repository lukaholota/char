import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Один запит сторінки питає це з кількох завантажувачів — `cache` робить із них один. */
export const findCurrentUserId = cache(async function findCurrentUserId(): Promise<number | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  return user?.id ?? null;
});
