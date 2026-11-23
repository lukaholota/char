"use server";

import { isCreatureBorderColor } from "@/rules/game-map-creatures";
import { setMapCreatureBorderColor } from "@/server/db/game-map-creatures";
import { isId, rejectBadInput, runAsUser } from "@/server/game-sessions/game-action";

export async function setMapCreatureBorderColorAction(sessionId: number, creatureId: number, borderColor: unknown) {
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(creatureId) || !isCreatureBorderColor(borderColor)) return rejectBadInput;
    return setMapCreatureBorderColor(sessionId, userId, creatureId, borderColor);
  });
}
