"use client";

import { useState } from "react";
import { removeSceneLightsAction, saveSceneLightAction, setHeroDarkvisionAction, setHeroTokenLightAction, setMapCreatureLightAction, setSceneLightingAction } from "@/lib/actions/game-scene-tools";
import { captureGameEvent } from "@/lib/monitoring/game-analytics";
import { LIGHT_LIMITS, LIGHT_PRESETS, type LightSource, type SceneLighting, type SceneLightView, type TokenLight } from "@/rules/game-lighting";
import type { TokenPosition } from "@/rules/game-map";
import type { MapCreatureView } from "@/rules/game-map-creatures";
import type { GameSessionMemberView, GameSessionView } from "@/server/db/game-sessions";
import { createIdChain } from "./id-chain";
import { pushUndoStep, rememberUndo } from "./map-history";
import { readOptimistic, sendOptimistic, useOptimisticReader } from "./optimistic-values";
import { useTokenDrag } from "./use-token-drag";

type Point = { clientX: number; clientY: number };
type LightDraft = LightSource & { isOn: boolean };
type Options = { view: GameSessionView; isEditing: boolean; findDropPosition: (point: Point) => TokenPosition | null; findViewCentre: () => TokenPosition };
export type LightPreset = (typeof LIGHT_PRESETS)[number];
export type TokenLightTarget = { kind: "hero"; member: GameSessionMemberView } | { kind: "creature"; creature: MapCreatureView };

const { findCurrentId, takeTempId, link } = createIdChain();
const toDraft = ({ at, brightFeet, dimFeet, isOn }: LightDraft): LightDraft => ({ at, brightFeet, dimFeet, isOn });

/// Джерела світла сцени й освітлення — лише майстрові; гравцеві вигляд уже несе лише запалені.
export function useMapLights({ view, isEditing, findDropPosition, findViewCentre }: Options) {
  const read = useOptimisticReader();
  const sceneId = view.viewedSceneId;
  const key = `lights:${sceneId}`;
  const lightingKey = `lighting:${sceneId}`;
  const [chosenId, setChosenId] = useState<number | null>(null);
  const readShown = () => readOptimistic(key, view.lights).map((light) => ({ ...light, id: findCurrentId(light.id) }));
  const findShown = (id: number) => readShown().find((light) => light.id === findCurrentId(id)) ?? null;

  const add = async (light: LightDraft, replacedId?: number): Promise<number | null> => {
    if (sceneId === null) return null;
    const tempId = takeTempId();
    if (replacedId !== undefined) link(replacedId, tempId);
    const result = await sendOptimistic(key, [...readShown(), { ...light, id: tempId }], () => saveSceneLightAction(view.id, sceneId, null, light));
    if (!result.ok) return null;
    link(tempId, result.value.id);
    return result.value.id;
  };
  const save = (id: number, light: LightDraft) => {
    const realId = findCurrentId(id);
    if (sceneId === null || realId < 0) return;
    void sendOptimistic(key, readShown().map((shown) => (shown.id === realId ? { ...shown, ...light } : shown)), () => saveSceneLightAction(view.id, sceneId, realId, light));
  };
  const removeNow = (id: number) => {
    const realId = findCurrentId(id);
    if (sceneId === null || realId < 0) return;
    void sendOptimistic(key, readShown().filter((light) => light.id !== realId), () => removeSceneLightsAction(view.id, sceneId, [realId]));
  };

  const sendLighting = (lighting: SceneLighting) => sceneId !== null && void sendOptimistic(lightingKey, lighting, () => setSceneLightingAction(view.id, sceneId, lighting));
  const setLighting = (next: SceneLighting) => {
    rememberUndo(sceneId, lightingKey, readOptimistic(lightingKey, view.lighting), next, sendLighting);
    sendLighting(next);
    captureGameEvent("game_lighting_changed", { lighting: next });
  };

  const placePreset = async (preset: LightPreset) => {
    if (sceneId === null) return;
    const light: LightDraft = { at: findViewCentre(), brightFeet: preset.brightFeet, dimFeet: preset.dimFeet, isOn: true };
    captureGameEvent("game_light_placed", { preset: preset.key, target: "scene" });
    const id = await add(light);
    if (id === null) return;
    setChosenId(id);
    pushUndoStep(sceneId, { undo: () => removeNow(id), redo: () => add(light, findCurrentId(id)) });
  };
  const change = (id: number, next: LightDraft) => {
    const current = findShown(id);
    if (!current) return;
    rememberUndo(sceneId, `light:${current.id}`, toDraft(current), next, (value) => save(current.id, value));
    save(current.id, next);
  };
  const remove = (id: number) => {
    const light = findShown(id);
    if (!light || sceneId === null) return;
    removeNow(light.id);
    setChosenId(null);
    pushUndoStep(sceneId, { undo: () => add(toDraft(light), light.id), redo: () => removeNow(light.id) });
  };

  const drag = useTokenDrag<number>(
    (id, point) => {
      const light = findShown(id);
      const at = findDropPosition(point);
      if (light && at) change(id, { ...toDraft(light), at });
    },
    (point) => findDropPosition(point) !== null,
    (id) => setChosenId(findCurrentId(id) === chosenId ? null : findCurrentId(id)),
  );

  const shown = read(key, view.lights).map((light) => ({ ...light, id: findCurrentId(light.id) }));
  const chosen = isEditing && chosenId !== null ? (shown.find((light) => light.id === findCurrentId(chosenId)) ?? null) : null;
  return {
    lighting: read(lightingKey, view.lighting),
    setLighting,
    shown,
    chosen,
    ghostId: drag.ghost?.id ?? null,
    isFull: shown.length >= LIGHT_LIMITS.perScene,
    findShownAt: (light: SceneLightView) => (drag.ghost?.id === light.id ? (findDropPosition(drag.ghost) ?? light.at) : light.at),
    bindLight: (id: number) => (isEditing && id > 0 ? drag.bindToken(id) : {}),
    choose: setChosenId,
    placePreset,
    change,
    remove,
  };
}

export type MapLights = ReturnType<typeof useMapLights>;

/// Смолоскип у руці героя ставить його гравець або майстер, істоті — майстер; темний зір перебиває лише майстер.
export function useTokenLights(view: GameSessionView) {
  const read = useOptimisticReader();
  const sceneId = view.viewedSceneId;
  const findLightKey = (target: TokenLightTarget) => (target.kind === "hero" ? `hero-light:${sceneId}:${target.member.heroId}` : `creature-light:${target.creature.id}`);
  const findDarkvisionKey = (member: GameSessionMemberView) => `hero-darkvision:${sceneId}:${member.heroId}`;
  const findLight = (target: TokenLightTarget): TokenLight => read(findLightKey(target), target.kind === "hero" ? target.member.light : target.creature.light);

  const sendLight = (target: TokenLightTarget, light: TokenLight) => {
    if (sceneId === null) return;
    const send = () => (target.kind === "hero" ? setHeroTokenLightAction(view.id, sceneId, target.member.heroId, light) : setMapCreatureLightAction(view.id, target.creature.id, light));
    void sendOptimistic(findLightKey(target), light, send);
  };
  const sendDarkvision = (member: GameSessionMemberView, feet: number | null) => {
    if (sceneId === null) return;
    rememberUndo(sceneId, findDarkvisionKey(member), read(findDarkvisionKey(member), member.darkvisionFeet), feet, (value) => sendDarkvision(member, value));
    void sendOptimistic(findDarkvisionKey(member), feet, () => setHeroDarkvisionAction(view.id, sceneId, member.heroId, feet));
  };

  return {
    findLight,
    /// Поки сервер не відповів на «як у листі», показуємо попереднє число.
    findDarkvision: (member: GameSessionMemberView) => read<number | null>(findDarkvisionKey(member), member.darkvisionFeet) ?? member.darkvisionFeet,
    setLight: (target: TokenLightTarget, light: TokenLight, presetKey: string) => {
      rememberUndo(sceneId, findLightKey(target), findLight(target), light, (value) => sendLight(target, value));
      sendLight(target, light);
      if (presetKey !== "none") captureGameEvent("game_light_placed", { preset: presetKey, target: target.kind });
    },
    sendDarkvision,
  };
}

export type TokenLights = ReturnType<typeof useTokenLights>;
