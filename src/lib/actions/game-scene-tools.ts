"use server";

import { parseAreaPlacement } from "@/rules/game-areas";
import { DRAWING_LIMITS, parseDrawingStrokes } from "@/rules/game-drawings";
import { parseFogChange } from "@/rules/game-fog";
import { parseSceneGrid } from "@/rules/game-grid";
import { changeSceneFog, changeSceneGrid, removeSceneAreas, removeSceneDrawings, saveSceneArea, saveSceneDrawings } from "@/server/db/game-scene-tools";
import { isId, rejectBadInput, runAsUser, tooFast } from "@/server/game-sessions/game-action";
import { tryTakeTokenMoveSlot } from "@/server/game-sessions/game-session-limits";

const rejectBadGrid = { ok: false as const, error: "bad_grid" as const };
const rejectBadFog = { ok: false as const, error: "bad_fog" as const };
const rejectBadArea = { ok: false as const, error: "bad_area" as const };
const rejectBadDrawing = { ok: false as const, error: "bad_drawing" as const };

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

export async function saveSceneDrawingsAction(sessionId: number, sceneId: number, rawStrokes: unknown) {
  const strokes = parseDrawingStrokes(rawStrokes);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId)) return rejectBadInput;
    if (!strokes) return rejectBadDrawing;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return saveSceneDrawings(sessionId, userId, sceneId, strokes);
  });
}

export async function removeSceneDrawingsAction(sessionId: number, sceneId: number, target: number[] | "all") {
  const isTargetValid = target === "all" || (Array.isArray(target) && target.length > 0 && target.length <= DRAWING_LIMITS.perScene && target.every(isId));
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !isTargetValid) return rejectBadInput;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return removeSceneDrawings(sessionId, userId, sceneId, target);
  });
}
