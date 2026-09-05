import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { canEditPers } from "@/lib/actions/pers";
import { findUserIdByEmail } from "@/server/db/users";

/// Маршрути `/api/character*` пишуть у чужі рядки `pers`, тому право на редагування тут
/// таке саме, як у серверних дій: власник, співвласник або редактор теки (`canEditPers`).
export async function findCharacterAccessFailure(persId: number): Promise<NextResponse | null> {
  if (!Number.isFinite(persId) || persId <= 0) {
    return NextResponse.json({ error: "Invalid character ID" }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = await findUserIdByEmail(session.user.email);
  if (userId === null) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canEdit = await canEditPers(persId, userId);
  if (!canEdit) {
    return NextResponse.json({ error: "Character not found or access denied" }, { status: 403 });
  }

  return null;
}
