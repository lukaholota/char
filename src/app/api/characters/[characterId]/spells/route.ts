import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SpellOrigin } from "@prisma/client";

/**
 * POST /api/characters/[characterId]/spells
 * Add a spell to a character
 * Body: { spellId: number }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { characterId } = await params;
  const persId = Number(characterId);
  
  if (!Number.isFinite(persId)) {
    return NextResponse.json({ error: "Invalid character ID" }, { status: 400 });
  }

  const body = await request.json();
  const { spellId } = body;

  if (typeof spellId !== "number") {
    return NextResponse.json({ error: "Invalid spell ID" }, { status: 400 });
  }

  // Verify user owns this character
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const character = await prisma.pers.findUnique({
    where: { persId },
    select: { userId: true },
  });

  if (!character || character.userId !== user.id) {
    return NextResponse.json({ error: "Character not found or access denied" }, { status: 403 });
  }

  // Check if spell exists
  const spell = await prisma.spell.findUnique({
    where: { spellId },
    select: { spellId: true },
  });

  if (!spell) {
    return NextResponse.json({ error: "Spell not found" }, { status: 404 });
  }

  // Check if already attached
  const existing = await prisma.persSpell.findUnique({
    where: {
      persId_spellId: { persId, spellId },
    },
  });

  if (existing) {
    return NextResponse.json({ 
      success: true, 
      added: false, 
      message: "Spell already attached" 
    });
  }

  // Add spell to character
  await prisma.persSpell.create({
    data: {
      persId,
      spellId,
      learnedAtLevel: 0,
      origin: SpellOrigin.MANUAL,
    },
  });

  return NextResponse.json({ success: true, added: true });
}

/**
 * DELETE /api/characters/[characterId]/spells
 * Remove a spell from a character
 * Body: { spellId: number }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { characterId } = await params;
  const persId = Number(characterId);
  
  if (!Number.isFinite(persId)) {
    return NextResponse.json({ error: "Invalid character ID" }, { status: 400 });
  }

  const body = await request.json();
  const { spellId } = body;

  if (typeof spellId !== "number") {
    return NextResponse.json({ error: "Invalid spell ID" }, { status: 400 });
  }

  // Verify user owns this character
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const character = await prisma.pers.findUnique({
    where: { persId },
    select: { userId: true },
  });

  if (!character || character.userId !== user.id) {
    return NextResponse.json({ error: "Character not found or access denied" }, { status: 403 });
  }

  // Remove spell from character
  await prisma.persSpell.deleteMany({
    where: { persId, spellId },
  });

  return NextResponse.json({ success: true, removed: true });
}
