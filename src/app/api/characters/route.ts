import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/characters
 * Returns the current user's characters with their spell IDs
 */
export async function GET() {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const characters = await prisma.pers.findMany({
    where: { userId: user.id },
    select: {
      persId: true,
      name: true,
      persSpells: {
        select: { spellId: true },
      },
    },
  });

  const result = characters.map((c) => ({
    characterId: c.persId,
    name: c.name,
    spellIds: c.persSpells.map((ps) => ps.spellId),
  }));

  return NextResponse.json(result);
}
