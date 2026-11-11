"use client";

import { useEffect, useRef, useState } from "react";
import { editSceneWallsAction, setSceneDoorOpenAction } from "@/lib/actions/game-scene-tools";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import type { MapFrame } from "@/rules/game-grid";
import type { TokenPosition } from "@/rules/game-map";
import { countWallSegments, cutDoor, findWallIdsNearPoint, snapWallPoint, WALL_LIMITS, type SceneWallView, type WallLine } from "@/rules/game-walls";
import type { GameSessionView } from "@/server/db/game-sessions";
import { pushUndoStep, useDraftUndo } from "./map-history";
import type { MapRect } from "./MapOverlay";
import { readOptimistic, sendOptimistic, useOptimisticReader } from "./optimistic-values";
import { createIdChain } from "./id-chain";
import { buildDragGesture, toRect } from "./use-map-tools";

type Point = { clientX: number; clientY: number };
type Options = { view: GameSessionView; toShare: (point: Point) => TokenPosition | null; frame: MapFrame | null; aspect: number | null; isEditing: boolean };
export type WallMode = "wall" | "room" | "door" | "edit";
type WallChange = "wall" | "room" | "door" | "move" | "remove" | "clear";

const { findCurrentId, takeTempId, link } = createIdChain();

/// Менший зсув — тремтіння пальця під час дотику, а не протягнута лінія.
const LINE_DRAG_SHARE = 0.01;

const clampShare = (at: TokenPosition) => ({ x: Math.min(1, Math.max(0, at.x)), y: Math.min(1, Math.max(0, at.y)) });
const isSamePoint = (left: TokenPosition, right: TokenPosition) => left.x === right.x && left.y === right.y;
const isLineDrag = (from: TokenPosition, at: TokenPosition) => Math.hypot(at.x - from.x, at.y - from.y) >= LINE_DRAG_SHARE;
const toLine = ({ kind, isOpen, points }: WallLine): WallLine => ({ kind, isOpen, points });
const buildRoomLine = (from: TokenPosition, to: TokenPosition): WallLine => ({ kind: "wall", isOpen: false, points: [from, { x: to.x, y: from.y }, to, { x: from.x, y: to.y }, from] });

export function useMapWalls({ view, toShare, frame, aspect, isEditing }: Options) {
  const read = useOptimisticReader();
  const sceneId = view.viewedSceneId;
  const key = `walls:${sceneId}`;
  const [mode, setModeState] = useState<WallMode>("wall");
  const [draft, setDraftState] = useState<TokenPosition[]>([]);
  const draftRef = useRef<TokenPosition[]>([]);
  const [pointer, setPointer] = useState<TokenPosition | null>(null);
  const [strokeStart, setStrokeStart] = useState<TokenPosition | null>(null);
  const [rect, setRect] = useState<MapRect | null>(null);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [moved, setMoved] = useState<{ id: number; points: TokenPosition[] } | null>(null);
  const readShown = () => readOptimistic(key, view.walls).map((wall) => ({ ...wall, id: findCurrentId(wall.id) }));

  const send = async (removedIds: number[], added: WallLine[], replacedIds: number[] = []): Promise<number[] | null> => {
    if (sceneId === null) return null;
    const removed = removedIds.map(findCurrentId).filter((id) => id > 0);
    const placed = added.map((line): SceneWallView => ({ ...line, id: takeTempId() }));
    replacedIds.forEach((id, index) => link(id, placed[index].id));
    if (!removed.length && !placed.length) return [];
    const shown = [...readShown().filter((wall) => !removed.includes(wall.id)), ...placed];
    const result = await sendOptimistic(key, shown, () => editSceneWallsAction(view.id, sceneId, { removedIds: removed, added }));
    if (!result.ok) return null;
    result.value.ids.forEach((id, index) => link(placed[index].id, id));
    return result.value.ids;
  };

  const change = (removed: SceneWallView[], added: WallLine[], kind: WallChange) => {
    if (sceneId === null || (!removed.length && !added.length)) return;
    const before = removed.map(toLine);
    const beforeIds = removed.map((wall) => wall.id);
    const segmentCount = countWallSegments(readShown()) - countWallSegments(removed) + countWallSegments(added);
    const afterIds = send(beforeIds, added);
    pushUndoStep(sceneId, {
      undo: async () => {
        const ids = await afterIds;
        if (ids) await send(ids, before, beforeIds);
      },
      redo: async () => {
        const ids = await afterIds;
        if (ids) await send(beforeIds, added, ids);
      },
    });
    captureGameEvent("game_walls_changed", { kind, segment_count: segmentCount });
  };

  const showDraft = (points: TokenPosition[]) => {
    draftRef.current = points;
    setDraftState(points);
  };
  /// Незавершена стіна не губиться: зміна режиму, інструмента чи закриття мапи її зберігає.
  const reset = () => {
    finishWall();
    showStroke(null, null);
    setRect(null);
    setChosenId(null);
  };
  const snap = (at: TokenPosition) => (aspect ? snapWallPoint(clampShare(at), [...readShown(), { kind: "wall", isOpen: false, points: draftRef.current }], frame, aspect) : clampShare(at));

  const finishWall = (points = draftRef.current) => {
    showDraft([]);
    if (points.length >= 2) change([], [{ kind: "wall", isOpen: false, points }], "wall");
  };
  /// Дотик у першу вершину замикає кімнату, повторний дотик в останню завершує стіну.
  const addVertex = (at: TokenPosition) => {
    const points = draftRef.current;
    const last = points.at(-1);
    if (last && isSamePoint(last, at)) return finishWall();
    if (points.length >= 2 && isSamePoint(points[0], at)) return finishWall([...points, at]);
    const next = [...points, at];
    if (next.length >= WALL_LIMITS.pointsPerWall) finishWall(next);
    else showDraft(next);
  };

  const finishOnLeaveRef = useRef(() => {});
  useEffect(() => {
    finishOnLeaveRef.current = () => finishWall();
  });
  useEffect(() => () => finishOnLeaveRef.current(), []);
  useDraftUndo(isEditing && draft.length ? () => showDraft(draftRef.current.slice(0, -1)) : null);

  const showStroke = (start: TokenPosition | null, at: TokenPosition | null) => {
    setStrokeStart(start);
    setPointer(at);
  };
  const drawWallLine = (from: TokenPosition, to: TokenPosition) => {
    finishWall();
    if (!isSamePoint(from, to)) change([], [{ kind: "wall", isOpen: false, points: [from, to] }], "wall");
  };
  const placeDoor = (from: TokenPosition, to: TokenPosition) => {
    showDraft([]);
    const shown = readShown();
    const edit = aspect ? cutDoor(shown, from, to, aspect) : null;
    if (edit) change(shown.filter((wall) => edit.removedIds.includes(wall.id)), edit.added, "door");
  };

  /// Дотик ставить кут чи кінець дверей по одному; протягнутий палець малює лінію від місця натискання до місця, де відпустили.
  const wallGesture = buildDragGesture(toShare, {
    start: (at) => showStroke(null, snap(at)),
    move: (from, at) => showStroke(isLineDrag(from, at) ? snap(from) : null, snap(at)),
    end: (from, at) => {
      showStroke(null, null);
      if (isLineDrag(from, at)) drawWallLine(snap(from), snap(at));
      else addVertex(snap(at));
    },
    cancel: () => showStroke(null, null),
  });

  const roomGesture = buildDragGesture(toShare, {
    start: () => setRect(null),
    move: (from, at) => setRect(toRect(snap(from), snap(at))),
    end: (from, at) => {
      setRect(null);
      const [start, end] = [snap(from), snap(at)];
      if (start.x !== end.x && start.y !== end.y) change([], [buildRoomLine(start, end)], "room");
    },
    cancel: () => setRect(null),
  });

  const doorGesture = buildDragGesture(toShare, {
    start: (at) => showStroke(null, clampShare(at)),
    move: (from, at) => showStroke(isLineDrag(from, at) ? clampShare(from) : null, clampShare(at)),
    end: (from, at) => {
      showStroke(null, null);
      const first = draftRef.current[0];
      if (isLineDrag(from, at)) placeDoor(clampShare(from), clampShare(at));
      else if (first) placeDoor(first, clampShare(at));
      else showDraft([clampShare(at)]);
    },
    cancel: () => showStroke(null, null),
  });

  const findChosen = () => (chosenId === null ? null : (readShown().find((wall) => wall.id === findCurrentId(chosenId)) ?? null));
  const moveVertex = (index: number, point: Point) => {
    const wall = findChosen();
    const at = toShare(point);
    if (!wall || !at || !aspect) return;
    const others = readShown().filter((each) => each.id !== wall.id);
    const points = (moved?.id === wall.id ? moved.points : wall.points).with(index, snapWallPoint(clampShare(at), others, frame, aspect));
    setMoved({ id: wall.id, points });
  };
  const endVertexMove = () => {
    const wall = findChosen();
    if (wall && moved?.id === wall.id) change([wall], [{ ...toLine(wall), points: moved.points }], "move");
    setMoved(null);
  };

  const setDoorOpen = (wallId: number, isOpen: boolean) => {
    const doorId = findCurrentId(wallId);
    if (sceneId === null || doorId < 0) return;
    const shown = readShown().map((wall) => (wall.id === doorId ? { ...wall, isOpen } : wall));
    void sendOptimistic(key, shown, () => setSceneDoorOpenAction(view.id, sceneId, doorId, isOpen));
  };
  const toggleDoor = (door: SceneWallView) => {
    if (sceneId !== null) pushUndoStep(sceneId, { undo: () => setDoorOpen(door.id, door.isOpen), redo: () => setDoorOpen(door.id, !door.isOpen) });
    setDoorOpen(door.id, !door.isOpen);
    captureGameEvent("game_door_toggled", { is_open: !door.isOpen });
  };

  const shown = read(key, view.walls).map((wall) => {
    const id = findCurrentId(wall.id);
    return moved?.id === id ? { ...wall, id, points: moved.points } : { ...wall, id };
  });
  const chosen = isEditing && mode === "edit" && chosenId !== null ? (shown.find((wall) => wall.id === findCurrentId(chosenId)) ?? null) : null;
  const isFull = countWallSegments(shown) >= WALL_LIMITS.segmentsPerScene;
  const canDraw = isEditing && aspect !== null && sceneId !== null && !isFull;
  return {
    shown,
    mode,
    setMode: (next: WallMode) => {
      reset();
      setModeState(next);
    },
    reset,
    draft: strokeStart ? [strokeStart] : draft,
    pointer,
    rect,
    chosen,
    isFull,
    gesture: canDraw && mode === "wall" ? wallGesture : canDraw && mode === "room" ? roomGesture : canDraw && mode === "door" ? doorGesture : null,
    chooseAt: (point: Point) => {
      const at = toShare(point);
      const ids = at && aspect ? findWallIdsNearPoint(clampShare(at), readShown(), aspect) : [];
      setChosenId(ids.at(-1) ?? null);
    },
    finishWall: () => finishWall(),
    dropDraft: () => showDraft([]),
    moveVertex,
    endVertexMove,
    removeChosen: () => {
      const wall = findChosen();
      if (wall) change([wall], [], "remove");
      setChosenId(null);
    },
    clearAll: () => change(readShown(), [], "clear"),
    toggleDoor,
  };
}

export type MapWalls = ReturnType<typeof useMapWalls>;
