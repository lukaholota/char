"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { changeSceneFogAction, changeSceneGridAction, removeSceneAreasAction, saveSceneAreaAction } from "@/lib/actions/game-scene-tools";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import type { AreaPlacement } from "@/rules/game-areas";
import { applyFogChange, isFogStroke, type FogChange } from "@/rules/game-fog";
import type { SceneGrid } from "@/rules/game-grid";
import type { GameSessionView } from "@/server/db/game-sessions";
import { rememberUndo } from "./map-history";
import { readOptimistic, sendOptimistic, useOptimisticReader } from "./optimistic-values";

const GRID_SAVE_DELAY_MS = 450;

const findFogEventKind = (change: FogChange) => (change.kind === "set" ? "undo" : change.kind === "area" && isFogStroke(change.area) ? "brush" : change.kind);

/// Зміни туману й областей видно одразу й на повноекранній мапі; правдою їх робить наступний стан кімнати з сервера.
export function useSceneTools(view: GameSessionView) {
  const read = useOptimisticReader();
  const sceneId = view.viewedSceneId;
  const fogKey = `fog:${sceneId}`;
  const areasKey = `areas:${sceneId}`;
  const fog = read(fogKey, view.fog);
  const areas = read(areasKey, view.areas);

  const changeFog = async (change: FogChange) => {
    if (sceneId === null) return;
    const current = readOptimistic(fogKey, view.fog);
    const next = applyFogChange(current, change);
    if (next === "too_many") return void toast.error("Забагато ділянок туману — сховайте все й відкрийте заново");
    rememberUndo(sceneId, fogKey, current, next, (fog) => changeFog({ kind: "set", fog }));
    const result = await sendOptimistic(fogKey, next, () => changeSceneFogAction(view.id, sceneId, change));
    if (result.ok) captureGameEvent("game_fog_changed", { kind: findFogEventKind(change) });
  };

  const saveArea = async (areaId: number | null, placement: AreaPlacement): Promise<number | null> => {
    if (sceneId === null) return null;
    const optimisticId = areaId ?? -Date.now();
    const shownAreas = readOptimistic(areasKey, view.areas);
    const next = [...shownAreas.filter((area) => area.id !== areaId), { ...placement, id: optimisticId, userId: view.myUserId }];
    const result = await sendOptimistic(areasKey, next, () => saveSceneAreaAction(view.id, sceneId, areaId, placement));
    if (!result.ok) return null;
    if (areaId === null) captureGameEvent("game_area_shown", { shape: placement.shape, is_gm: view.myRole === "GM" });
    return result.value.id;
  };

  const removeAreas = async (areaId: number | null) => {
    if (sceneId === null) return;
    const shownAreas = readOptimistic(areasKey, view.areas);
    await sendOptimistic(areasKey, areaId === null ? [] : shownAreas.filter((area) => area.id !== areaId), () => removeSceneAreasAction(view.id, sceneId, areaId));
  };

  return { fog, areas, changeFog, saveArea, removeAreas };
}

/// Сітку майстер підганяє серією дрібних змін: показуємо чернетку одразу, а зберігаємо, коли він зупинився.
export function useGridDraft(view: GameSessionView) {
  const [draft, setDraft] = useState<{ sceneId: number | null; grid: SceneGrid | null } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const timer = useRef(0);
  const sceneId = view.viewedSceneId;
  const activeDraft = draft?.sceneId === sceneId ? draft : null;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const changeGrid = (grid: SceneGrid | null) => {
    if (sceneId === null) return;
    setDraft({ sceneId, grid });
    setIsSaving(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const result = await changeSceneGridAction(view.id, sceneId, grid);
      setIsSaving(false);
      if (!result.ok) {
        setDraft(null);
        return void toast.error(result.error);
      }
      captureGameEvent("game_grid_changed", { has_grid: grid !== null });
    }, GRID_SAVE_DELAY_MS);
  };

  return { grid: activeDraft ? activeDraft.grid : view.grid, isSaving, changeGrid, dropDraft: () => !isSaving && setDraft(null) };
}
