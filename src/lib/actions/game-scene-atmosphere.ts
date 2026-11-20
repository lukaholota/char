"use server";

import { parseAmbience, parseSceneAtmosphere } from "@/rules/game-atmosphere";
import { parseFloorChange, parseFloorId } from "@/rules/game-floors";
import { parseObjectPlacement } from "@/rules/game-objects";
import { setSceneAmbience, setSceneAtmosphere } from "@/server/db/game-scene-atmosphere";
import { addFloorPlan, changeSceneFloors } from "@/server/db/game-scene-floors";
import { isId, rejectBadInput, runAsUser } from "@/server/game-sessions/game-action";

const reject = <E extends "bad_atmosphere" | "bad_ambience" | "bad_floor" | "bad_object">(error: E) => ({ ok: false as const, error });

export async function setSceneAtmosphereAction(sessionId: number, sceneId: number, rawAtmosphere: unknown) {
  const atmosphere = parseSceneAtmosphere(rawAtmosphere);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId)) return rejectBadInput;
    if (!atmosphere) return reject("bad_atmosphere");
    return setSceneAtmosphere(sessionId, userId, sceneId, atmosphere);
  });
}

export async function setSceneAmbienceAction(sessionId: number, sceneId: number, rawLayers: unknown) {
  const layers = parseAmbience(rawLayers);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId)) return rejectBadInput;
    if (!layers) return reject("bad_ambience");
    return setSceneAmbience(sessionId, userId, sceneId, layers);
  });
}

export async function changeSceneFloorsAction(sessionId: number, sceneId: number, rawChange: unknown) {
  const change = parseFloorChange(rawChange);
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId)) return rejectBadInput;
    if (!change) return reject("bad_floor");
    return changeSceneFloors(sessionId, userId, sceneId, change);
  });
}

/// Розміщення приходить JSON-рядком поруч із файлом: FormData не несе чисел.
export async function addFloorPlanAction(sessionId: number, sceneId: number, formData: FormData) {
  return runAsUser(async (userId) => {
    if (!isId(sessionId) || !isId(sceneId) || !(formData instanceof FormData)) return rejectBadInput;
    const floor = parseFloorId(Number(formData.get("floor")));
    const placement = parseObjectPlacement({
      ...readJson(formData.get("placement")),
      rotation: 0,
      name: null,
      isHidden: false,
      floor,
    });
    if (floor === undefined || floor === null) return reject("bad_floor");
    if (!placement) return reject("bad_object");
    return addFloorPlan(sessionId, userId, sceneId, formData.get("file"), placement);
  });
}

function readJson(raw: FormDataEntryValue | null): Record<string, unknown> {
  try {
    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : null;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
