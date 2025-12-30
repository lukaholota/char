import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const { magicItemId } = await request.json();

    if (!characterId || !magicItemId) {
      return NextResponse.json({ error: "Missing characterId or magicItemId" }, { status: 400 });
    }

    const persIdInt = parseInt(characterId, 10);
    const magicItemIdInt = parseInt(magicItemId, 10);

    // Create the PersMagicItem link
    await prisma.persMagicItem.create({
      data: {
        persId: persIdInt,
        magicItemId: magicItemIdInt,
        isEquipped: false,
        isAttuned: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error adding magic item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await params;
    const { magicItemId } = await request.json();

    if (!characterId || !magicItemId) {
      return NextResponse.json({ error: "Missing characterId or magicItemId" }, { status: 400 });
    }

    const persIdInt = parseInt(characterId, 10);
    const magicItemIdInt = parseInt(magicItemId, 10);

    // Delete ONE instance of this item
    const itemToDelete = await prisma.persMagicItem.findFirst({
        where: {
            persId: persIdInt,
            magicItemId: magicItemIdInt
        }
    });

    if (itemToDelete) {
        await prisma.persMagicItem.delete({
            where: { persMagicItemId: itemToDelete.persMagicItemId }
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting magic item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
