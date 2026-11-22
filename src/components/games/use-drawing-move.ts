"use client";

import { useRef, useState } from "react";
import { moveSceneDrawingAction } from "@/lib/actions/game-scene-tools";
import { findDrawingBounds, findEditableDrawingAt, moveDrawingPoints, resizeDrawingPoints, type SceneDrawingView } from "@/rules/game-drawings";
import type { TokenPosition } from "@/rules/game-map";
import { isPointNearStroke, isSamePoint } from "@/rules/map-strokes";
import type { GameSessionView } from "@/server/db/game-sessions";
import { pushUndoStep } from "./map-history";
import { sendOptimistic } from "./optimistic-values";
import { buildDragGesture } from "./use-map-tools";

type ToShare = (point: { clientX: number; clientY: number }) => TokenPosition | null;
type Drag = { drawing: SceneDrawingView; kind: "move" | "resize"; anchor: TokenPosition; handle: TokenPosition };
type Options = { view: GameSessionView; key: string; toShare: ToShare; aspect: number | null; readShown: () => SceneDrawingView[]; findRealId: (id: number) => number | null };

const HANDLE_REACH = 0.03;
const hasMoved = (points: TokenPosition[], before: TokenPosition[]) => points.some((point, index) => !isSamePoint(point, before[index]));

/// Дотик по своєму малюнку виділяє його й тягне; кутова ручка рамки міняє розмір.
export function useDrawingMove({ view, key, toShare, aspect, readShown, findRealId }: Options) {
  const sceneId = view.viewedSceneId;
  const isGm = view.myRole === "GM";
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<TokenPosition[] | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const draftRef = useRef<TokenPosition[] | null>(null);

  const showDraft = (points: TokenPosition[] | null) => {
    draftRef.current = points;
    setDraft(points);
  };
  const findSelected = () => readShown().find((drawing) => drawing.id === selectedId) ?? null;

  const sendPoints = (realId: number, points: TokenPosition[]) => {
    if (sceneId === null) return;
    const moved = readShown().map((drawing) => (findRealId(drawing.id) === realId ? { ...drawing, points } : drawing));
    void sendOptimistic(key, moved, () => moveSceneDrawingAction(view.id, sceneId, realId, points));
  };
  const commit = (drawing: SceneDrawingView, points: TokenPosition[]) => {
    const realId = findRealId(drawing.id);
    if (realId === null || sceneId === null) return;
    sendPoints(realId, points);
    pushUndoStep(sceneId, { undo: () => sendPoints(realId, drawing.points), redo: () => sendPoints(realId, points) });
  };

  const startDrag = (at: TokenPosition) => {
    if (!aspect) return;
    const selected = findSelected();
    const bounds = selected && findDrawingBounds(selected, aspect);
    if (selected && bounds && isPointNearStroke(at, [bounds.to], HANDLE_REACH, aspect)) {
      dragRef.current = { drawing: selected, kind: "resize", anchor: bounds.from, handle: bounds.to };
      return;
    }
    const hit = findEditableDrawingAt(at, readShown(), aspect, view.myUserId, isGm);
    setSelectedId(hit?.id ?? null);
    dragRef.current = hit ? { drawing: hit, kind: "move", anchor: at, handle: at } : null;
  };
  const dragTo = (from: TokenPosition, at: TokenPosition) => {
    const drag = dragRef.current;
    if (!drag || !aspect) return;
    const points = drag.kind === "move" ? moveDrawingPoints(drag.drawing.points, from, at) : resizeDrawingPoints(drag.drawing.points, drag.anchor, drag.handle, at, aspect);
    if (points) showDraft(points);
  };
  const gesture = buildDragGesture(toShare, {
    start: startDrag,
    move: dragTo,
    end: (from, at) => {
      dragTo(from, at);
      const [drag, points] = [dragRef.current, draftRef.current];
      dragRef.current = null;
      showDraft(null);
      if (drag && points && hasMoved(points, drag.drawing.points)) commit(drag.drawing, points);
    },
    cancel: () => {
      dragRef.current = null;
      showDraft(null);
    },
  });

  return {
    selectedId,
    draft,
    gesture,
    findSelected,
    deselect: () => setSelectedId(null),
  };
}
