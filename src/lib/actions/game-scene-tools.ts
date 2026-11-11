"use server";

import { parseAreaPlacement } from "@/rules/game-areas";
import { DRAWING_LIMITS, parseDrawingStrokes } from "@/rules/game-drawings";
import { parseFogChange } from "@/rules/game-fog";
import { parseSceneGrid } from "@/rules/game-grid";
import { LIGHT_LIMITS, parseLightSource, parseSceneLighting, parseTokenLight } from "@/rules/game-lighting";
import { OBJECT_LIMITS, parseObjectPlacement } from "@/rules/game-objects";
import { parseWallEdit } from "@/rules/game-walls";
import { addSceneObject, changeSceneObject, removeSceneObjects } from "@/server/db/game-scene-objects";
import { removeSceneLights, saveSceneLight, setSceneLighting } from "@/server/db/game-scene-lighting";
import { editSceneWalls, setSceneDoorOpen } from "@/server/db/game-scene-walls";
import { setMapCreatureLight } from "@/server/db/game-map-creatures";
import { setHeroDarkvision, setHeroTokenLight } from "@/server/db/game-scenes";
import { changeSceneFog, changeSceneGrid, removeSceneAreas, removeSceneDrawings, saveSceneArea, saveSceneDrawings } from "@/server/db/game-scene-tools";
import { isId, rejectBadInput, runAsUser, tooFast } from "@/server/game-sessions/game-action";
import { tryTakeTokenMoveSlot } from "@/server/game-sessions/game-session-limits";

const rejectBadGrid = { ok: false as const, error: "bad_grid" as const };
const rejectBadFog = { ok: false as const, error: "bad_fog" as const };
const rejectBadArea = { ok: false as const, error: "bad_area" as const };
const rejectBadDrawing = { ok: false as const, error: "bad_drawing" as const };
const rejectBadObject = { ok: false as const, error: "bad_object" as const };
const rejectBadWall = { ok: false as const, error: "bad_wall" as const };
const rejectBadLight = { ok: false as const, error: "bad_light" as const };
const isFeetOrNull = (value: unknown): value is number | null => value === null || (Number.isInteger(value) && (value as number) >= 0 && (value as number) <= LIGHT_LIMITS.feet);
const isImageKey = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200;

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

export async function addSceneObjectAction(sessionId: number, sceneId: number, imageKey: string, rawPlacement: unknown) {
  const placement = parseObjectPlacement(rawPlacement);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !isImageKey(imageKey)) return rejectBadInput;
    if (!placement) return rejectBadObject;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return addSceneObject(sessionId, userId, sceneId, imageKey, placement);
  });
}

export async function changeSceneObjectAction(sessionId: number, sceneId: number, objectId: number, rawPlacement: unknown) {
  const placement = parseObjectPlacement(rawPlacement);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !isId(objectId)) return rejectBadInput;
    if (!placement) return rejectBadObject;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return changeSceneObject(sessionId, userId, sceneId, objectId, placement);
  });
}

export async function removeSceneObjectsAction(sessionId: number, sceneId: number, objectIds: number[]) {
  const isTargetValid = Array.isArray(objectIds) && objectIds.length > 0 && objectIds.length <= OBJECT_LIMITS.perScene && objectIds.every(isId);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !isTargetValid) return rejectBadInput;
    return removeSceneObjects(sessionId, userId, sceneId, objectIds);
  });
}

export async function editSceneWallsAction(sessionId: number, sceneId: number, rawEdit: unknown) {
  const edit = parseWallEdit(rawEdit);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId)) return rejectBadInput;
    if (!edit) return rejectBadWall;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return editSceneWalls(sessionId, userId, sceneId, edit);
  });
}

export async function setSceneDoorOpenAction(sessionId: number, sceneId: number, doorId: number, isOpen: boolean) {
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !isId(doorId) || typeof isOpen !== "boolean") return rejectBadInput;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return setSceneDoorOpen(sessionId, userId, sceneId, doorId, isOpen);
  });
}

export async function setSceneLightingAction(sessionId: number, sceneId: number, rawLighting: unknown) {
  const lighting = parseSceneLighting(rawLighting);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !lighting) return rejectBadInput;
    return setSceneLighting(sessionId, userId, sceneId, lighting);
  });
}

export async function saveSceneLightAction(sessionId: number, sceneId: number, lightId: number | null, rawLight: unknown) {
  const light = parseLightSource(rawLight);
  const isOn = (rawLight as { isOn?: unknown } | null)?.isOn;
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || (lightId !== null && !isId(lightId))) return rejectBadInput;
    if (!light || typeof isOn !== "boolean") return rejectBadLight;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return saveSceneLight(sessionId, userId, sceneId, lightId, { ...light, isOn });
  });
}

export async function removeSceneLightsAction(sessionId: number, sceneId: number, lightIds: number[]) {
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !Array.isArray(lightIds) || lightIds.length > LIGHT_LIMITS.perScene || !lightIds.every(isId)) return rejectBadInput;
    return removeSceneLights(sessionId, userId, sceneId, lightIds);
  });
}

export async function setHeroTokenLightAction(sessionId: number, sceneId: number, heroId: number, rawLight: unknown) {
  const light = parseTokenLight(rawLight);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !isId(heroId)) return rejectBadInput;
    if (!light) return rejectBadLight;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return setHeroTokenLight(sessionId, userId, sceneId, heroId, light);
  });
}

export async function setHeroDarkvisionAction(sessionId: number, sceneId: number, heroId: number, darkvisionFeet: number | null) {
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !isId(heroId) || !isFeetOrNull(darkvisionFeet)) return rejectBadInput;
    return setHeroDarkvision(sessionId, userId, sceneId, heroId, darkvisionFeet);
  });
}

export async function setMapCreatureLightAction(sessionId: number, creatureId: number, rawLight: unknown) {
  const light = parseTokenLight(rawLight);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(creatureId)) return rejectBadInput;
    if (!light) return rejectBadLight;
    if (!tryTakeTokenMoveSlot(userId)) return tooFast;
    return setMapCreatureLight(sessionId, userId, creatureId, light);
  });
}
