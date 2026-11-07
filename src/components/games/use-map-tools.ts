"use client";

import { useRef, useState } from "react";
import { findAngleTowards, snapAreaAngle, type AreaPlacement, type SceneAreaView } from "@/rules/game-areas";
import { parseFogArea, type FogChange } from "@/rules/game-fog";
import { buildGridFromCells, snapToGrid, snapToHalfCell, type MapFrame, type SceneGrid } from "@/rules/game-grid";
import type { TokenPosition } from "@/rules/game-map";
import type { MapRect, MapSegment } from "./MapOverlay";
import type { MapGesture } from "./use-map-viewport";

type Point = { clientX: number; clientY: number };
export type MapTool = "ruler" | "area" | "fog" | "grid" | "view";
type ToShare = (point: Point) => TokenPosition | null;

const TAP_SLOP_SHARE = 0.004;
const clampShare = (point: TokenPosition) => ({ x: Math.min(1, Math.max(0, point.x)), y: Math.min(1, Math.max(0, point.y)) });
const toRect = (from: TokenPosition, to: TokenPosition): MapRect => ({ x: Math.min(from.x, to.x), y: Math.min(from.y, to.y), width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y) });

/// Перетягування пальцем від точки до точки в частках мапи; спільна основа лінійки, рамок і зсуву.
function buildDragGesture(toShare: ToShare, handlers: { start: (at: TokenPosition) => void; move: (from: TokenPosition, at: TokenPosition) => void; end: (from: TokenPosition, at: TokenPosition) => void; cancel: () => void }): MapGesture {
  let from: TokenPosition | null = null;
  return {
    start: (point) => {
      from = toShare(point);
      if (from) handlers.start(from);
    },
    move: (point) => {
      const at = toShare(point);
      if (from && at) handlers.move(from, at);
    },
    end: (point) => {
      const at = toShare(point);
      if (from && at) handlers.end(from, at);
      from = null;
    },
    cancel: () => {
      from = null;
      handlers.cancel();
    },
  };
}

export function useRulerTool(toShare: ToShare, frame: MapFrame | null) {
  const [ruler, setRuler] = useState<MapSegment | null>(null);
  const snap = (at: TokenPosition) => (frame ? snapToGrid(clampShare(at), frame) : clampShare(at));
  const gesture = frame
    ? buildDragGesture(toShare, {
        start: (at) => setRuler({ from: snap(at), to: snap(at) }),
        move: (from, at) => setRuler({ from: snap(from), to: snap(at) }),
        end: (from, at) => setRuler({ from: snap(from), to: snap(at) }),
        cancel: () => setRuler(null),
      })
    : null;
  return { ruler, gesture, clear: () => setRuler(null) };
}

export type FogBrush = "reveal" | "hide";

export function useFogTool(toShare: ToShare, frame: MapFrame | null, changeFog: (change: FogChange) => void) {
  const [brush, setBrush] = useState<FogBrush>("reveal");
  const [rect, setRect] = useState<MapRect | null>(null);
  const snap = (at: TokenPosition) => (frame ? snapToGrid(clampShare(at), frame, 2) : clampShare(at));
  const gesture = buildDragGesture(toShare, {
    start: () => setRect(null),
    move: (from, at) => setRect(toRect(snap(from), snap(at))),
    end: (from, at) => {
      setRect(null);
      const area = parseFogArea({ isRevealed: brush === "reveal", ...toRect(snap(from), snap(at)) });
      if (area) changeFog({ kind: "area", area });
    },
    cancel: () => setRect(null),
  });
  return { brush, setBrush, rect, gesture };
}

export type GridMode = "shift" | "fit";

/// «Зсунути» тягне сітку пальцем; «Підігнати» — рамка навколо намальованих клітинок задає їхній розмір і початок.
export function useGridTool(toShare: ToShare, aspect: number | null, grid: SceneGrid | null, changeGrid: (grid: SceneGrid | null) => void) {
  const [mode, setModeState] = useState<GridMode>("shift");
  const [isFitted, setIsFitted] = useState(false);
  const [cellsAcross, setCellsAcross] = useState(3);
  const setMode = (next: GridMode) => {
    setIsFitted(false);
    setModeState(next);
  };
  const [rect, setRect] = useState<MapRect | null>(null);
  const shiftStart = useRef<SceneGrid | null>(null);
  const shiftGesture = buildDragGesture(toShare, {
    start: () => {
      shiftStart.current = grid;
      setIsFitted(false);
    },
    move: (from, at) => {
      const start = shiftStart.current;
      if (!start || !aspect) return;
      const rows = start.columns / aspect;
      changeGrid({ ...start, offsetX: wrap(start.offsetX + (at.x - from.x) * start.columns), offsetY: wrap(start.offsetY + (at.y - from.y) * rows) });
    },
    end: () => {
      shiftStart.current = null;
    },
    cancel: () => {
      if (shiftStart.current) changeGrid(shiftStart.current);
      shiftStart.current = null;
    },
  });
  const fitGesture = buildDragGesture(toShare, {
    start: () => setRect(null),
    move: (from, at) => setRect(toRect(clampShare(from), clampShare(at))),
    end: (from, at) => {
      setRect(null);
      const fitted = aspect ? buildGridFromCells(toRect(clampShare(from), clampShare(at)), cellsAcross, aspect) : null;
      if (!fitted) return;
      changeGrid({ ...fitted, isVisible: false });
      setModeState("shift");
      setIsFitted(true);
    },
    cancel: () => setRect(null),
  });
  return { mode, setMode, isFitted, cellsAcross, setCellsAcross, rect, gesture: mode === "fit" ? fitGesture : grid ? shiftGesture : null };
}

const wrap = (value: number) => ((value % 1) + 1) % 1;

export type AreaDraft = { id: number | null; placement: AreaPlacement; canEdit: boolean };

/// Чернетку області видно лише автору, доки він не натисне «Показати всім»; збережену область автор чи майстер правлять одразу.
export type AreaDraftStore = { draft: AreaDraft | null; latestDraft: { current: AreaDraft | null }; setDraft: (next: AreaDraft | null) => void };

export function useAreaTool(store: AreaDraftStore, toShare: ToShare, frame: MapFrame | null, saveArea: (id: number | null, placement: AreaPlacement) => Promise<number | null>) {
  const { draft, latestDraft, setDraft } = store;
  const moveStart = useRef<TokenPosition | null>(null);
  const snapOrigin = (at: TokenPosition) => (frame ? snapToHalfCell(clampShare(at), frame) : clampShare(at));

  /// Рух пальця приходить швидше за рендер, тож зміна читає останню чернетку з ref, а не зі стану.
  const change = (placement: Partial<AreaPlacement>, shouldSave = false) => {
    const current = latestDraft.current;
    if (!current?.canEdit) return;
    const next = { ...current, placement: { ...current.placement, ...placement } };
    setDraft(next);
    if (shouldSave && next.id !== null) void saveArea(next.id, next.placement);
  };

  const gesture: MapGesture | null =
    draft?.canEdit && frame
      ? buildDragGesture(toShare, {
          start: () => {
            moveStart.current = latestDraft.current?.placement.origin ?? null;
          },
          move: (from, at) => {
            const origin = moveStart.current;
            if (origin) change({ origin: snapOrigin({ x: origin.x + at.x - from.x, y: origin.y + at.y - from.y }) });
          },
          end: (from, at) => {
            const isTap = Math.hypot(at.x - from.x, at.y - from.y) < TAP_SLOP_SHARE;
            const origin = moveStart.current;
            moveStart.current = null;
            if (isTap) return change({ origin: snapOrigin(at) }, true);
            if (origin) change({ origin: snapOrigin({ x: origin.x + at.x - from.x, y: origin.y + at.y - from.y }) }, true);
          },
          cancel: () => {
            if (moveStart.current) change({ origin: moveStart.current });
            moveStart.current = null;
          },
        })
      : null;

  const aim = (point: Point) => {
    const at = toShare(point);
    const current = latestDraft.current;
    if (at && current && frame) change({ angle: snapAreaAngle(current.placement.shape, findAngleTowards(current.placement.origin, at, frame)) });
  };
  const moveOrigin = (point: Point) => {
    const at = toShare(point);
    if (at) change({ origin: snapOrigin(at) });
  };

  const share = async () => {
    const current = latestDraft.current;
    if (!current || current.id !== null) return;
    const id = await saveArea(null, current.placement);
    if (id !== null && latestDraft.current) setDraft({ ...latestDraft.current, id });
  };

  const open = (area: SceneAreaView, canEdit: boolean) => setDraft({ id: area.id, placement: area, canEdit });

  return { draft, setDraft, change, gesture, aim, moveOrigin, commit: () => change({}, true), share, open, close: () => setDraft(null) };
}
