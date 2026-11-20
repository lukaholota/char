"use client";

import { useRef, useState } from "react";
import { removeSceneDrawingsAction, saveSceneDrawingsAction } from "@/lib/actions/game-scene-tools";
import { canEraseDrawing, DRAWING_LIMITS, findDrawingPointGap, findErasableDrawingIds, parseDrawingStroke, type DrawingColor, type DrawingShape, type DrawingStroke, type DrawingWidth, type SceneDrawingView } from "@/rules/game-drawings";
import { snapToHalfCell, type MapFrame } from "@/rules/game-grid";
import type { TokenPosition } from "@/rules/game-map";
import { appendStrokePoint, isPointNearStroke } from "@/rules/map-strokes";
import type { GameSessionView } from "@/server/db/game-sessions";
import { pushUndoStep, useDraftUndo } from "./map-history";
import { readOptimistic, sendOptimistic, useOptimisticReader } from "./optimistic-values";
import { buildDragGesture } from "./use-map-tools";

type Point = { clientX: number; clientY: number };
type ToShare = (point: Point) => TokenPosition | null;
export type DrawMode = "pen" | "eraser";

/// Нова лінія живе з тимчасовим від'ємним id, доки сервер не поверне справжній: гумка й скасування шукають її за обома.
const realIdByTempId = new Map<number, number>();
let lastTempId = 0;
const RESTORE_CHUNK = 50;
const findRealId = (id: number) => (id > 0 ? id : (realIdByTempId.get(id) ?? null));
const clampShare = (at: TokenPosition) => ({ x: Math.min(1, Math.max(0, at.x)), y: Math.min(1, Math.max(0, at.y)) });
const toStroke = ({ shape, isFilled, color, width, points }: DrawingStroke): DrawingStroke => ({ shape, isFilled, color, width, points });

export function useMapDrawings(view: GameSessionView, toShare: ToShare, aspect: number | null, frame: MapFrame | null) {
  const read = useOptimisticReader();
  const sceneId = view.viewedSceneId;
  const key = `drawings:${sceneId}`;
  const isGm = view.myRole === "GM";
  const [mode, setMode] = useState<DrawMode>("pen");
  const [color, setColor] = useState<DrawingColor>("red");
  const [width, setWidth] = useState<DrawingWidth>("thin");
  const [shape, setShapeState] = useState<DrawingShape>("line");
  const [isFilled, setIsFilled] = useState(false);
  const [isSnapOff, setIsSnapOff] = useState(false);
  const [corners, setCorners] = useState<TokenPosition[]>([]);
  const cornersRef = useRef<TokenPosition[]>([]);
  const [line, setLine] = useState<DrawingStroke | null>(null);
  const lineRef = useRef<DrawingStroke | null>(null);
  const [erasingIds, setErasingIds] = useState<number[]>([]);
  const erasingRef = useRef<number[]>([]);
  const readShown = () => readOptimistic(key, view.drawings);

  const save = async (strokes: DrawingStroke[]): Promise<number[] | null> => {
    if (sceneId === null) return null;
    const added = strokes.map((stroke): SceneDrawingView => ({ ...stroke, id: --lastTempId, userId: view.myUserId }));
    const result = await sendOptimistic(key, [...readShown(), ...added], () => saveSceneDrawingsAction(view.id, sceneId, strokes));
    if (!result.ok) return null;
    result.value.ids.forEach((id, index) => realIdByTempId.set(added[index].id, id));
    return result.value.ids;
  };

  const remove = (realIds: number[] | "all") => {
    const shown = readShown();
    const removed = shown.filter((drawing) => (realIds === "all" ? canEraseDrawing(drawing, view.myUserId, isGm) : realIds.includes(findRealId(drawing.id) ?? 0)));
    if (sceneId === null || removed.length === 0) return [];
    void sendOptimistic(key, shown.filter((drawing) => !removed.includes(drawing)), () => removeSceneDrawingsAction(view.id, sceneId, realIds));
    return removed;
  };

  /// Повтор зберігає лінію наново з новим id, тож крок памʼятає останнє збереження.
  const draw = (stroke: DrawingStroke) => {
    if (sceneId === null) return;
    let saving = save([stroke]);
    pushUndoStep(sceneId, {
      undo: async () => {
        const ids = await saving;
        if (ids) remove(ids);
      },
      redo: () => {
        saving = save([stroke]);
      },
    });
  };

  /// Частинами: 300 довгих ліній одним запитом перевищують ліміт тіла server action (1 МБ).
  const restore = async (strokes: DrawingStroke[]) => {
    const ids: number[] = [];
    for (let start = 0; start < strokes.length; start += RESTORE_CHUNK) ids.push(...((await save(strokes.slice(start, start + RESTORE_CHUNK))) ?? []));
    return ids;
  };

  const erase = (target: number[] | "all") => {
    const removed = remove(target);
    if (sceneId === null || !removed.length) return;
    const strokes = removed.map(toStroke);
    let restoring: Promise<number[]> = Promise.resolve([]);
    pushUndoStep(sceneId, {
      undo: () => {
        restoring = restore(strokes);
        return restoring;
      },
      redo: async () => {
        const ids = await restoring;
        if (ids.length) remove(ids);
      },
    });
  };

  const buildStroke = (points: TokenPosition[], strokeShape = shape): DrawingStroke => ({ shape: strokeShape, isFilled, color, width, points });
  const snap = (at: TokenPosition) => (frame && !isSnapOff ? snapToHalfCell(clampShare(at), frame) : clampShare(at));
  const isNear = (at: TokenPosition, point: TokenPosition | undefined) => Boolean(point && aspect && isPointNearStroke(at, [point], DRAWING_LIMITS.eraserReach, aspect));
  const drawIfValid = (stroke: DrawingStroke) => {
    const parsed = parseDrawingStroke(stroke);
    if (parsed) draw(parsed);
  };

  const showCorners = (points: TokenPosition[]) => {
    cornersRef.current = points;
    setCorners(points);
  };
  /// Менше трьох вершин — не фігура, просто відкидаємо.
  const finishPolygon = (points = cornersRef.current) => {
    showCorners([]);
    drawIfValid(buildStroke(points, "polygon"));
  };
  /// Дотик у першу чи повторно в останню вершину замикає багатокутник.
  const addCorner = (at: TokenPosition) => {
    const points = cornersRef.current;
    if (points.length >= 3 && (isNear(at, points[0]) || isNear(at, points.at(-1)))) return finishPolygon();
    const next = [...points, at];
    if (next.length >= DRAWING_LIMITS.polygonPoints) finishPolygon(next);
    else showCorners(next);
  };
  useDraftUndo(corners.length ? () => showCorners(cornersRef.current.slice(0, -1)) : null);

  const showLine = (next: DrawingStroke | null) => {
    lineRef.current = next;
    setLine(next);
  };
  const extendLine = (at: TokenPosition) => {
    const current = lineRef.current;
    if (current && aspect) showLine({ ...current, points: appendStrokePoint(current.points, clampShare(at), findDrawingPointGap(current.width), aspect) });
  };
  const penGesture = buildDragGesture(toShare, {
    start: (at) => showLine(buildStroke([clampShare(at)])),
    move: (_from, at) => extendLine(at),
    end: (_from, at) => {
      extendLine(at);
      const stroke = lineRef.current;
      showLine(null);
      if (stroke) drawIfValid(stroke);
    },
    cancel: () => showLine(null),
  });
  const shapeGesture = buildDragGesture(toShare, {
    start: () => showLine(null),
    move: (from, at) => showLine(buildStroke([snap(from), snap(at)])),
    end: (from, at) => {
      showLine(null);
      drawIfValid(buildStroke([snap(from), snap(at)]));
    },
    cancel: () => showLine(null),
  });
  const polygonGesture = buildDragGesture(toShare, { start: () => {}, move: () => {}, end: (_from, at) => addCorner(snap(at)), cancel: () => {} });
  const reset = () => {
    finishPolygon();
    showLine(null);
  };

  const showErasing = (ids: number[]) => {
    erasingRef.current = ids;
    setErasingIds(ids);
  };
  const collectErased = (at: TokenPosition) => {
    if (!aspect) return;
    const hit = findErasableDrawingIds(clampShare(at), readShown(), aspect, view.myUserId, isGm).filter((id) => !erasingRef.current.includes(id));
    if (hit.length) showErasing([...erasingRef.current, ...hit]);
  };
  const eraserGesture = buildDragGesture(toShare, {
    start: collectErased,
    move: (_from, at) => collectErased(at),
    end: (_from, at) => {
      collectErased(at);
      const realIds = erasingRef.current.flatMap((id) => findRealId(id) ?? []);
      showErasing([]);
      if (realIds.length) erase(realIds);
    },
    cancel: () => showErasing([]),
  });

  const saved = read(key, view.drawings);
  const preview = line ?? (corners.length ? buildStroke(corners, "line") : null);
  const shown = [...saved.filter((drawing) => !erasingIds.includes(drawing.id)), ...(preview ? [{ ...preview, id: 0, userId: view.myUserId }] : [])];
  const drawGesture = shape === "line" ? penGesture : shape === "polygon" ? polygonGesture : shapeGesture;
  const canDraw = sceneId !== null && aspect !== null && !view.isArchived;
  return {
    shown,
    mode,
    setMode: (next: DrawMode) => {
      reset();
      setMode(next);
    },
    shape,
    setShape: (next: DrawingShape) => {
      reset();
      setShapeState(next);
    },
    isFilled,
    setIsFilled,
    isSnapOff,
    setIsSnapOff,
    hasGrid: frame !== null,
    cornerCount: corners.length,
    finishPolygon: () => finishPolygon(),
    dropPolygon: () => showCorners([]),
    reset,
    color,
    setColor,
    width,
    setWidth,
    hasErasable: saved.some((drawing) => canEraseDrawing(drawing, view.myUserId, isGm)),
    eraseAll: () => erase("all"),
    gesture: canDraw ? (mode === "pen" ? drawGesture : eraserGesture) : null,
  };
}

export type MapDrawings = ReturnType<typeof useMapDrawings>;
