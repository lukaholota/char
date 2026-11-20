"use client";

import { toast } from "sonner";
import { addFloorPlanAction, changeSceneFloorsAction } from "@/lib/actions/game-scene-atmosphere";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { MAX_MAP_UPLOAD_BYTES } from "@/lib/media-upload-limits";
import { applyFloorChange, findLandingFloor, isTokenHiddenByFloor, type FloorChange, type FloorId, type FloorPiece, type FloorState } from "@/rules/game-floors";
import { CELLS_ACROSS_MAP_WITHOUT_GRID, findBackSortOrder, findObjectWidthShare, type SceneObjectView } from "@/rules/game-objects";
import type { TokenPosition } from "@/rules/game-map";
import type { GameSessionView } from "@/server/db/game-sessions";
import { sendOptimistic, useOptimisticReader } from "./optimistic-values";
import { findObjectsKey } from "./use-map-objects";

type FloorsInput = {
  view: GameSessionView;
  aspect: number | null;
  gridColumns: number | null;
  findViewCentre: () => TokenPosition;
};
export type MapFloors = ReturnType<typeof useMapFloors>;

/// План, що збігається з мапою за пропорціями, лягає на всю мапу; інший — третиною ширини в центр екрана.
const MATCHING_ASPECT_SLACK = 0.03;
const PLAN_SHARE_OF_MAP = 1 / 3;

export const findFloorKey = (sceneId: number | null) => `floors:${sceneId}`;

export function useMapFloors({ view, aspect, gridColumns, findViewCentre }: FloorsInput) {
  const read = useOptimisticReader();
  const sceneId = view.viewedSceneId;
  const key = findFloorKey(sceneId);
  const state = read<FloorState>(key, {
    floors: view.floors,
    shown: view.shownFloor,
  });
  const objects = read<SceneObjectView[]>(findObjectsKey(sceneId), view.objects);
  const pieces: FloorPiece[] = objects.flatMap((object) =>
    object.floor === null || object.isHidden
      ? []
      : [
          {
            floor: object.floor,
            at: object.at,
            widthShare: findObjectWidthShare(object.widthCells, gridColumns),
            aspect: object.aspect,
            rotation: object.rotation,
          },
        ],
  );
  const mapAspect = aspect ?? 1;
  const columns = gridColumns ?? CELLS_ACROSS_MAP_WITHOUT_GRID;

  const change = async (floorChange: FloorChange) => {
    if (sceneId === null) return;
    const next = applyFloorChange(state, floorChange);
    if (next === "floor_limit" || next === "bad_floor") return void toast.error(next === "floor_limit" ? "Більше поверхів не додати — приберіть зайвий" : "Цього поверху вже немає");
    const result = await sendOptimistic(key, next, () => changeSceneFloorsAction(view.id, sceneId, floorChange));
    if (result.ok) captureGameEvent("game_floor_changed", { kind: floorChange.kind });
  };

  const uploadPlan = async (floor: number, file: File): Promise<boolean> => {
    if (sceneId === null) return false;
    if (file.size > MAX_MAP_UPLOAD_BYTES) {
      toast.error(`План завеликий — до ${Math.round(MAX_MAP_UPLOAD_BYTES / 1024 / 1024)} МБ. Зменште картинку й спробуйте ще раз.`);
      return false;
    }
    const fileAspect = await readImageAspect(file);
    if (!fileAspect) {
      toast.error("Не вдалося прочитати картинку — оберіть PNG, JPG або WebP");
      return false;
    }
    const fillsMap = Math.abs(fileAspect / mapAspect - 1) <= MATCHING_ASPECT_SLACK;
    const placement = {
      at: fillsMap ? { x: 0.5, y: 0.5 } : findViewCentre(),
      widthCells: Math.round(columns * (fillsMap ? 1 : PLAN_SHARE_OF_MAP) * 100) / 100,
      aspect: fileAspect,
      sortOrder: findBackSortOrder(objects),
    };
    const formData = new FormData();
    formData.set("file", file);
    formData.set("floor", String(floor));
    formData.set("placement", JSON.stringify(placement));
    const result = await addFloorPlanAction(view.id, sceneId, formData).catch(() => ({
      ok: false as const,
      error: "Не вдалося завантажити план. Перевірте звʼязок і спробуйте ще раз.",
    }));
    if (!result.ok) toast.error(result.error);
    else captureGameEvent("game_floor_plan_added", { fills_map: fillsMap });
    return result.ok;
  };

  return {
    floors: state.floors,
    shown: state.shown,
    change,
    uploadPlan,
    hasPlan: (floor: number) => pieces.some((piece) => piece.floor === floor),
    isOffFloor: (token: { at: TokenPosition; floor: FloorId }) => isTokenHiddenByFloor(token, state.shown, pieces, mapAspect),
    findLanding: (to: TokenPosition) => findLandingFloor(to, state.shown, pieces, mapAspect),
  };
}

async function readImageAspect(file: File): Promise<number | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const aspect = bitmap.width / bitmap.height;
  bitmap.close();
  return aspect;
}
