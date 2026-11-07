"use server";

import { parseAreaPlacement } from "@/rules/game-areas";
import { parseFogChange } from "@/rules/game-fog";
import { parseSceneGrid } from "@/rules/game-grid";
import { changeSceneFog, changeSceneGrid, removeSceneAreas, saveSceneArea } from "@/server/db/game-scene-tools";
import { isId, rejectBadInput, runAsUser, tooFast } from "@/server/game-sessions/game-action";
import { tryTakeTokenMoveSlot } from "@/server/game-sessions/game-session-limits";

const rejectBadGrid = { ok: false as const, error: "bad_grid" as const };
const rejectBadFog = { ok: false as const, error: "bad_fog" as const };
const rejectBadArea = { ok: false as const, error: "bad_area" as const };

export async function changeSceneGridAction(sessionId: number, sceneId: number, rawGrid: unknown) {
  const grid = rawGrid === null ? null : parseSceneGrid(rawGrid);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId)) return rejectBadInput;
    if (rawGrid !== null && !grid) return rejectBadGrid;
    return changeSceneGrid(sessionId, userId, sceneId, grid);
  });
}

export async function changeSceneFogAction(sessionId: number, sceneId: number, rawChange: unknown) {
  const change = parseFogChange(rawChange);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId)) return rejectBadInput;
    if (!change) return rejectBadFog;
    return changeSceneFog(sessionId, userId, sceneId, change);
  });
}

export async function saveSceneAreaAction(sessionId: number, sceneId: number, areaId: number | null, rawPlacement: unknown) {
  const placement = parseAreaPlacement(rawPlacement);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || (areaId !== null && !isId(areaId))) return rejectBadInput;
    if (!placement) return rejectBadArea;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return saveSceneArea(sessionId, userId, sceneId, areaId, placement);
  });
}

export async function removeSceneAreasAction(sessionId: number, sceneId: number, areaId: number | null) {
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || (areaId !== null && !isId(areaId))) return rejectBadInput;
    return removeSceneAreas(sessionId, userId, sceneId, areaId);
  });
}
