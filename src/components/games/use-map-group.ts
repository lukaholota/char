"use client";

import { useState, type CSSProperties } from "react";
import { moveMapTokensAction } from "@/lib/actions/game-sessions";
import type { TokenPosition } from "@/rules/game-map";
import { collectKeysInRect, shiftGroup, type GroupMove, type PositionMove, type ShareRect } from "@/rules/map-group";
import type { GameSessionView } from "@/server/db/game-sessions";
import { findHeroPositionKey } from "./HeroTokens";
import { findCreaturePositionKey } from "./MapCreatureTokens";
import type { TokenDrag } from "./MapTokenSlot";
import type { TokenSelection } from "./TokenTransformControls";
import { pushUndoStep } from "./map-history";
import { sendOptimisticMany } from "./optimistic-values";
import type { MapObjects } from "./use-map-objects";
import { buildDragGesture, toRect } from "./use-map-tools";

type Point = { clientX: number; clientY: number };
export type GroupItem = { key: string; position: TokenPosition };
export type GroupShift = { key: string; from: TokenPosition; to: TokenPosition | null };

type GroupOptions = {
  toShare: (point: Point) => TokenPosition | null;
  collectItems: () => GroupItem[];
  onPickOne: (key: string | null) => void;
  onMove: (shifts: GroupShift[]) => void;
};

export type MapGroup = ReturnType<typeof useMapGroup>;

/// Рамка мишею збирає групу; одна влучена річ стає звичайним вибором, порожня рамка знімає вибір.
export function useMapGroup({ toShare, collectItems, onPickOne, onMove }: GroupOptions) {
  const [keys, setKeys] = useState<string[]>([]);
  const [rect, setRect] = useState<ShareRect | null>(null);
  const findMembers = () => collectItems().filter((item) => keys.includes(item.key));

  const pickInRect = (from: TokenPosition, to: TokenPosition) => {
    const hits = collectKeysInRect(collectItems(), toRect(from, to));
    setKeys(hits.length > 1 ? hits : []);
    onPickOne(hits.length === 1 ? hits[0] : null);
  };
  const boxGesture = buildDragGesture(toShare, {
    start: (at) => setRect(toRect(at, at)),
    move: (from, at) => setRect(toRect(from, at)),
    end: (from, at) => {
      setRect(null);
      pickInRect(from, at);
    },
    cancel: () => setRect(null),
  });

  /// Тягнуть один токен групи — решта зсувається на той самий крок після відпускання.
  const moveWith = (key: string, to: TokenPosition): boolean => {
    const members = findMembers();
    const anchor = members.find((item) => item.key === key);
    if (!anchor || members.length < 2) return false;
    const step = { x: to.x - anchor.position.x, y: to.y - anchor.position.y };
    onMove(shiftGroup(members, step).map((item) => ({ key: item.key, from: item.position, to: item.next })));
    return true;
  };

  return { rect, boxGesture, findMembers, isGrouped: (key: string) => keys.includes(key), moveWith, clear: () => setKeys([]) };
}

/// Поки тягнуть учасника групи, решта показує той самий крок ще до відпускання.
export function buildGroupShiftStyle(group: MapGroup, drag: TokenDrag | null): CSSProperties | undefined {
  if (!drag?.from || !drag.to || !group.isGrouped(drag.key)) return undefined;
  return { "--group-dx": drag.to.x - drag.from.x, "--group-dy": drag.to.y - drag.from.y } as CSSProperties;
}

export const findIdInGroupKey = (key: string) => Number(key.slice(key.lastIndexOf("-") + 1));

type BoardGroupOptions = {
  view: GameSessionView;
  toShare: GroupOptions["toShare"];
  selection: TokenSelection;
  isEditingObjects: boolean;
  findObjects: () => MapObjects;
  findTokens: () => GroupItem[];
};

/// З інструментом «Предмети» рамка збирає предмети, без інструмента — токени героїв та істот.
export function useBoardGroup({ view, toShare, selection, isEditingObjects, findObjects, findTokens }: BoardGroupOptions) {
  const moveTokenGroup = useTokenGroupMoves(view);
  const collectItems = (): GroupItem[] => (isEditingObjects ? findObjects().shown.filter((object) => object.id > 0).map((object) => ({ key: `object-${object.id}`, position: object.at })) : findTokens());
  const onMove = (shifts: GroupShift[]) => (isEditingObjects ? findObjects().moveMany(shifts.flatMap((shift) => (shift.to ? [{ id: findIdInGroupKey(shift.key), from: shift.from, at: shift.to }] : []))) : moveTokenGroup(shifts));
  const onPickOne = (key: string | null) => (isEditingObjects ? findObjects().choose(key ? findIdInGroupKey(key) : null) : selection.select(key));
  const group = useMapGroup({ toShare, collectItems, onPickOne, onMove });
  const tokenSelection = { ...selection, tap: (key: string, open: () => void) => { group.clear(); selection.tap(key, open); } };
  return { group, moveTokenGroup, tokenSelection };
}

/// Група токенів іде одним запитом: поодинці вона швидко вичерпала б ліміт ходів, а скасування — один крок.
export function useTokenGroupMoves(view: GameSessionView) {
  const send = (sceneId: number, shifts: Array<{ key: string; at: TokenPosition | null }>) => {
    const heroes: GroupMove[] = [];
    const creatures: PositionMove[] = [];
    const shown: Record<string, TokenPosition | null> = {};
    for (const { key, at } of shifts) {
      const id = findIdInGroupKey(key);
      if (key.startsWith("hero-")) {
        heroes.push({ id, at });
        shown[findHeroPositionKey(sceneId, id)] = at;
      } else if (at) {
        creatures.push({ id, at });
        shown[findCreaturePositionKey(id)] = at;
      }
    }
    return sendOptimisticMany(shown, () => moveMapTokensAction(view.id, sceneId, { heroes, creatures }));
  };

  return (shifts: GroupShift[]) => {
    const sceneId = view.viewedSceneId;
    if (sceneId === null || !shifts.length) return;
    const before = shifts.map((shift) => ({ key: shift.key, at: shift.from }));
    const after = shifts.map((shift) => ({ key: shift.key, at: shift.to }));
    pushUndoStep(sceneId, { undo: () => send(sceneId, before), redo: () => send(sceneId, after) });
    void send(sceneId, after);
  };
}
