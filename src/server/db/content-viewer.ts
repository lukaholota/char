import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ContentViewer = { userId: number | null; isModerator: boolean; name: string | null; displayName: string | null };

export const NOT_SIGNED_IN = "Увійдіть, щоб долучитися до обговорення";

export async function findContentViewer(): Promise<ContentViewer> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { userId: null, isModerator: false, name: null, displayName: null };
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, displayName: true } });
  return { userId: user?.id ?? null, isModerator: Boolean(user) && isModeratorEmail(email), name: user?.name ?? null, displayName: user?.displayName ?? null };
}

function isModeratorEmail(email: string): boolean {
  const moderators = String(process.env.HOMEBREW_MODERATOR_EMAILS ?? "").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  return moderators.includes(email.toLowerCase());
}
