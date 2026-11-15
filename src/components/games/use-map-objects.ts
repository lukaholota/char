"use client";

import { useState } from "react";
import { addSceneObjectAction, changeSceneObjectAction, moveSceneObjectsAction, removeSceneObjectsAction } from "@/lib/actions/game-scene-tools";
import { buildMediaImageUrl } from "@/lib/media-url";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { applyObjectTransform, findBackSortOrder, findFrontSortOrder, findObjectWidthShare, OBJECT_LIMITS, toObjectPlacement, type ObjectPlacement, type SceneObjectView } from "@/rules/game-objects";
import { shiftTokenPosition, type TokenPosition } from "@/rules/game-map";
import type { TokenTransform } from "@/rules/token-transform";
import type { GameSessionView } from "@/server/db/game-sessions";
import { holdValueBefore, pushUndoStep, rememberUndo } from "./map-history";
import { readOptimistic, sendOptimistic, showOptimistic, useOptimisticReader } from "./optimistic-values";
import { createIdChain } from "./id-chain";
import { useTokenDrag } from "./use-token-drag";

type Point = { clientX: number; clientY: number };
type Options = { view: GameSessionView; isEditing: boolean; gridColumns: number | null; findDropPosition: (point: Point) => TokenPosition | null; findViewCentre: () => TokenPosition; group: { isGrouped: (key: string) => boolean; moveWith: (key: string, to: TokenPosition) => boolean; clear: () => void } };
type ObjectMove = { id: number; at: TokenPosition };

const { findCurrentId, takeTempId, link } = createIdChain();
const COPY_SHIFT = 0.03;

const shiftShare = (share: number) => (share + COPY_SHIFT > 1 ? share - COPY_SHIFT : share + COPY_SHIFT);

export function useMapObjects({ view, isEditing, gridColumns, findDropPosition, findViewCentre, group }: Options) {
  const read = useOptimisticReader();
  const sceneId = view.viewedSceneId;
  const key = `objects:${sceneId}`;
  const [chosenId, setChosenId] = useState<number | null>(null);
  const readShown = () => readOptimistic(key, view.objects).map((object) => ({ ...object, id: findCurrentId(object.id) }));
  const findShown = (id: number) => readShown().find((object) => object.id === findCurrentId(id)) ?? null;

  const add = async (imageKey: string, placement: ObjectPlacement, replacedId?: number): Promise<number | null> => {
    if (sceneId === null) return null;
    const tempId = takeTempId();
    if (replacedId !== undefined) link(replacedId, tempId);
    const added: SceneObjectView = { ...placement, id: tempId, imageKey, imageUrl: buildMediaImageUrl(imageKey, "full") };
    const result = await sendOptimistic(key, [...readShown(), added], () => addSceneObjectAction(view.id, sceneId, imageKey, placement));
    if (!result.ok) return null;
    link(tempId, result.value.id);
    return result.value.id;
  };

  const save = (id: number, placement: ObjectPlacement) => {
    const realId = findCurrentId(id);
    if (sceneId === null || realId < 0) return;
    const shown = readShown().map((object) => (object.id === realId ? { ...object, ...placement } : object));
    void sendOptimistic(key, shown, () => changeSceneObjectAction(view.id, sceneId, realId, placement));
  };

  const removeNow = (id: number) => {
    const realId = findCurrentId(id);
    if (sceneId === null || realId < 0) return;
    void sendOptimistic(key, readShown().filter((object) => object.id !== realId), () => removeSceneObjectsAction(view.id, sceneId, [realId]));
  };

  const place = async (imageKey: string, placement: ObjectPlacement) => {
    if (sceneId === null) return;
    const id = await add(imageKey, placement);
    if (id === null) return;
    setChosenId(id);
    pushUndoStep(sceneId, { undo: () => removeNow(id), redo: () => add(imageKey, placement, findCurrentId(id)) });
  };

  const change = (id: number, next: ObjectPlacement) => {
    const current = findShown(id);
    if (!current) return;
    rememberUndo(sceneId, `object:${current.id}`, toObjectPlacement(current), next, (value) => save(current.id, value));
    save(current.id, next);
  };

  const preview = (id: number, transform: TokenTransform) => {
    const current = findShown(id);
    if (!current) return;
    holdValueBefore(`object:${current.id}`, toObjectPlacement(current));
    showOptimistic(key, readShown().map((object) => (object.id === current.id ? applyObjectTransform(object, transform) : object)));
  };

  const erase = (id: number) => {
    const object = findShown(id);
    if (!object || sceneId === null) return;
    removeNow(object.id);
    setChosenId(null);
    const placement = toObjectPlacement(object);
    pushUndoStep(sceneId, { undo: () => add(object.imageKey, placement, object.id), redo: () => removeNow(object.id) });
  };

  const sendMoves = (moves: ObjectMove[]) => {
    const targets = new Map(moves.map((move) => [move.id, move.at]));
    const shown = readShown().map((object) => ({ ...object, at: targets.get(object.id) ?? object.at }));
    if (sceneId !== null) void sendOptimistic(key, shown, () => moveSceneObjectsAction(view.id, sceneId, moves));
  };
  const moveMany = (moves: Array<ObjectMove & { from: TokenPosition }>) => {
    const placed = moves.filter((move) => move.id > 0);
    if (sceneId === null || !placed.length) return;
    const toMoves = (pick: "at" | "from") => placed.map((move) => ({ id: move.id, at: move[pick] }));
    pushUndoStep(sceneId, { undo: () => sendMoves(toMoves("from")), redo: () => sendMoves(toMoves("at")) });
    sendMoves(toMoves("at"));
  };
  /// shortcut: скасування ставить обʼєкти назад поодинці й упирається в ліміт ходів понад ~30 за раз; тоді — пакетне додавання.
  const eraseMany = (ids: number[]) => {
    const erased = readShown().filter((object) => ids.includes(object.id) && object.id > 0);
    if (sceneId === null || !erased.length) return;
    const removeAll = () => {
      const realIds = erased.map((object) => findCurrentId(object.id));
      return sendOptimistic(key, readShown().filter((object) => !realIds.includes(object.id)), () => removeSceneObjectsAction(view.id, sceneId, realIds));
    };
    void removeAll();
    pushUndoStep(sceneId, { undo: () => erased.forEach((object) => void add(object.imageKey, toObjectPlacement(object), findCurrentId(object.id))), redo: removeAll });
  };

  const others = (id: number) => readShown().filter((object) => object.id !== id);
  const actOnChosen = (act: (object: SceneObjectView) => void) => () => {
    const object = chosenId === null ? null : findShown(chosenId);
    if (object) act(object);
  };

  const drag = useTokenDrag<number>(
    (id, point) => {
      const object = findShown(id);
      const at = findDropPosition(point);
      if (at && group.moveWith(`object-${findCurrentId(id)}`, at)) return;
      if (object && at) change(id, { ...toObjectPlacement(object), at });
    },
    (point) => findDropPosition(point) !== null,
    (id) => {
      group.clear();
      setChosenId(findCurrentId(id) === chosenId ? null : findCurrentId(id));
    },
  );

  const shown = read(key, view.objects)
    .map((object) => ({ ...object, id: findCurrentId(object.id) }))
    .toSorted((left, right) => left.sortOrder - right.sortOrder || left.id - right.id);
  const chosen = isEditing && chosenId !== null ? (shown.find((object) => object.id === findCurrentId(chosenId)) ?? null) : null;
  const dragged = drag.ghost ? shown.find((object) => object.id === drag.ghost?.id) : undefined;
  const draggedTo = drag.ghost && dragged ? findDropPosition(drag.ghost) : null;
  const isGroupDrag = dragged !== undefined && group.isGrouped(`object-${dragged.id}`);
  const findShownAt = (object: SceneObjectView) => {
    if (!dragged || !draggedTo) return object.at;
    if (object.id === dragged.id) return draggedTo;
    return isGroupDrag && group.isGrouped(`object-${object.id}`) ? shiftTokenPosition(object.at, { x: draggedTo.x - dragged.at.x, y: draggedTo.y - dragged.at.y }) : object.at;
  };
  return {
    shown,
    chosen,
    ghostId: drag.ghost?.id ?? null,
    isFull: shown.length >= OBJECT_LIMITS.perScene,
    findShownAt,
    findWidthShare: (object: SceneObjectView) => findObjectWidthShare(object.widthCells, gridColumns),
    bindObject: (id: number) => (isEditing && id > 0 ? drag.bindToken(id) : {}),
    choose: setChosenId,
    canDropAt: (point: Point) => findDropPosition(point) !== null,
    placeFromLibrary: async (imageKey: string, widthCells = 1, dropPoint?: Point) => {
      const at = (dropPoint && findDropPosition(dropPoint)) ?? findViewCentre();
      await place(imageKey, { at, widthCells, rotation: 0, name: null, isHidden: false, sortOrder: findFrontSortOrder(readShown()) });
      captureGameEvent("game_object_placed", { is_copy: false });
    },
    change,
    changeTransform: (id: number, transform: TokenTransform) => {
      const object = findShown(id);
      if (object) change(id, applyObjectTransform(toObjectPlacement(object), transform));
    },
    preview,
    copy: actOnChosen((object) => {
      const placement = { ...toObjectPlacement(object), at: { x: shiftShare(object.at.x), y: shiftShare(object.at.y) }, sortOrder: findFrontSortOrder(readShown()) };
      void place(object.imageKey, placement);
      captureGameEvent("game_object_placed", { is_copy: true });
    }),
    toggleHidden: actOnChosen((object) => {
      change(object.id, { ...toObjectPlacement(object), isHidden: !object.isHidden });
      captureGameEvent("game_object_hidden_toggled", { is_hidden: !object.isHidden });
    }),
    raise: actOnChosen((object) => change(object.id, { ...toObjectPlacement(object), sortOrder: findFrontSortOrder(others(object.id)) })),
    lower: actOnChosen((object) => change(object.id, { ...toObjectPlacement(object), sortOrder: findBackSortOrder(others(object.id)) })),
    remove: actOnChosen((object) => erase(object.id)),
    moveMany,
    eraseMany,
  };
}

export type MapObjects = ReturnType<typeof useMapObjects>;
