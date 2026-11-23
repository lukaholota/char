"use client";

import { useModeRouter } from "@/components/no-ai/NoAiModeProvider";
import { setMapCreatureBorderColorAction } from "@/lib/actions/game-creature-border-color";
import { changeMapCreatureHitPointsAction, setCreatureNameModeAction, setMapCreatureCutoutAction, setMapCreatureSizeAction, transformMapCreatureAction } from "@/lib/actions/game-sessions";
import { applyHitPointChange, findHitPointChangesTo, isCreatureDown, type CreatureHitPoints, type HitPointChange } from "@/rules/creature-hit-points";
import type { CreatureBorderColor, CreatureTokenSize, MapCreatureView, TokenNameMode } from "@/rules/game-map-creatures";
import type { TokenTransform } from "@/rules/token-transform";
import type { GameSessionView } from "@/server/db/game-sessions";
import { holdValueBefore, pushUndoStep, rememberUndo } from "./map-history";
import { readOptimistic, sendOptimistic, showOptimistic, useOptimisticReader } from "./optimistic-values";

const findBorderColorKey = (id: number) => `creature-border-color:${id}`;

export function useCreatureLooks(view: GameSessionView) {
  const router = useModeRouter();
  const read = useOptimisticReader();
  const nameModeKey = `creature-name-mode:${view.id}`;
  const findHitPointsKey = (creature: MapCreatureView) => `creature-hp:${creature.id}`;
  const finish = (result: { ok: boolean }) => result.ok && router.refresh();
  const findCreature = (id: number) => view.creatures.find((creature) => creature.id === id);
  const findSizeById = (id: number) => readOptimistic(`creature-size:${id}`, findCreature(id)?.tokenSize ?? null);

  const sendSize = async (id: number, size: CreatureTokenSize) => {
    const before = findSizeById(id);
    if (before) rememberUndo(view.viewedSceneId, `creature-size:${id}`, before, size, (restored) => sendSize(id, restored));
    finish(await sendOptimistic(`creature-size:${id}`, size, () => setMapCreatureSizeAction(view.id, id, size)));
  };
  const findCutoutKey = (creature: MapCreatureView) => `creature-cutout:${creature.ruleset}:${creature.creatureKey}`;
  const findIsCutout = (creature: MapCreatureView) => read(findCutoutKey(creature), creature.isCutout);
  const sendCutout = async (creature: MapCreatureView, isCutout: boolean) => {
    rememberUndo(view.viewedSceneId, findCutoutKey(creature), readOptimistic(findCutoutKey(creature), creature.isCutout), isCutout, (restored) => sendCutout(creature, restored));
    finish(await sendOptimistic(findCutoutKey(creature), isCutout, () => setMapCreatureCutoutAction(view.id, creature.id, isCutout)));
  };
  const sendBorderColor = async (creature: MapCreatureView, color: CreatureBorderColor) => {
    const key = findBorderColorKey(creature.id);
    rememberUndo(view.viewedSceneId, key, readOptimistic(key, creature.borderColor), color, (restored) => sendBorderColor(creature, restored));
    finish(await sendOptimistic(key, color, () => setMapCreatureBorderColorAction(view.id, creature.id, color)));
  };
  const applyPendingLook = (creature: MapCreatureView): MapCreatureView => {
    const isCutout = findIsCutout(creature);
    const borderColor = read(findBorderColorKey(creature.id), creature.borderColor);
    return isCutout === creature.isCutout && borderColor === creature.borderColor ? creature : { ...creature, isCutout, borderColor };
  };
  const findTransformKey = (id: number) => `creature-transform:${id}`;
  const findTransform = (creature: MapCreatureView) => read(findTransformKey(creature.id), creature.tokenTransform);
  const findTransformById = (id: number) => readOptimistic(findTransformKey(id), findCreature(id)?.tokenTransform ?? null);
  const showTransform = (id: number, transform: TokenTransform) => {
    holdValueBefore(findTransformKey(id), findTransformById(id));
    showOptimistic(findTransformKey(id), transform);
  };
  const sendTransform = async (id: number, transform: TokenTransform) => {
    const before = findTransformById(id);
    if (before) rememberUndo(view.viewedSceneId, findTransformKey(id), before, transform, (restored) => sendTransform(id, restored));
    finish(await sendOptimistic(findTransformKey(id), transform, () => transformMapCreatureAction(view.id, id, transform)));
  };
  const sendNameMode = async (mode: TokenNameMode) => {
    rememberUndo(view.viewedSceneId, nameModeKey, readOptimistic(nameModeKey, view.creatureNameMode), mode, sendNameMode);
    finish(await sendOptimistic(nameModeKey, mode, () => setCreatureNameModeAction(view.id, mode)));
  };
  /// Скасування й повтор шлють різницю між двома відомими значеннями: збережене на клієнті могло вже застаріти.
  const sendHitPointPath = async (creature: MapCreatureView, from: CreatureHitPoints, to: CreatureHitPoints) => {
    let shown = from;
    for (const change of findHitPointChangesTo(from, to)) {
      shown = applyHitPointChange(shown, change) ?? shown;
      if (!(await sendOptimistic(findHitPointsKey(creature), shown, () => changeMapCreatureHitPointsAction(view.id, creature.id, change))).ok) return;
    }
    router.refresh();
  };
  const sendHitPointChange = async (creature: MapCreatureView, change: HitPointChange) => {
    const before = readOptimistic(findHitPointsKey(creature), creature.hitPoints);
    const after = applyHitPointChange(before, change);
    if (view.viewedSceneId !== null && before && after) pushUndoStep(view.viewedSceneId, { undo: () => sendHitPointPath(creature, after, before), redo: () => sendHitPointPath(creature, before, after) });
    finish(await sendOptimistic(findHitPointsKey(creature), after ?? creature.hitPoints, () => changeMapCreatureHitPointsAction(view.id, creature.id, change)));
  };
  const applyPendingHitPoints = (creature: MapCreatureView): MapCreatureView => {
    const hitPoints = read(findHitPointsKey(creature), creature.hitPoints);
    return hitPoints === creature.hitPoints || !hitPoints ? creature : { ...creature, hitPoints, isDown: isCreatureDown(hitPoints) };
  };

  return {
    nameMode: read(nameModeKey, view.creatureNameMode),
    findSize: (creature: MapCreatureView) => read(`creature-size:${creature.id}`, creature.tokenSize),
    sendSize,
    findIsCutout,
    sendCutout,
    applyPendingLook,
    sendBorderColor,
    findTransform,
    showTransform,
    sendTransform,
    sendNameMode,
    sendHitPointChange,
    applyPendingHitPoints,
  };
}
