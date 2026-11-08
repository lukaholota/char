"use client";

import { create } from "zustand";
import type { AreaSpellList } from "@/lib/actions/game-area-spells";
import { findPressedAction } from "@/lib/components/dice/roll-contexts";
import { useDiceUIStore, type DiceRollContext } from "@/lib/stores/diceUIStore";
import { useGameSessionStore } from "@/lib/stores/gameSessionStore";
import { findSpellSaveDamage } from "@/rules/creature-save";
import type { AreaShape } from "@/rules/game-areas";
import { findGameRollKind } from "@/rules/game-roll-target";
import type { RollTargets } from "@/rules/map-target-picks";
import { showRoomTab } from "@/components/games/room-tabs";
import { useGameSessionLiveStore } from "./game-session-live-store";

export type CastArea = { name: string; shape: AreaShape; sizeFeet: number };
export type AreaCast = { sessionId: number; roll: DiceRollContext; area: CastArea; isPlaced: boolean };

const spellLists = new Map<number, Promise<AreaSpellList | null>>();
const readyMapBoards = new Map<number, number>();
const griddedMapBoards = new Map<number, number>();

export const useAreaCastStore = create<{ cast: AreaCast | null }>(() => ({ cast: null }));

/// Список заклинань з областю не змінюється посеред гри, тож тягнемо його раз на кімнату.
/// Дію вантажимо ліниво: лист і статблоки імпортують цей модуль, а серверна дія тягне за собою next-auth.
export function loadAreaSpells(sessionId: number) {
  const cached = spellLists.get(sessionId);
  if (cached) return cached;
  const loading = import("@/lib/actions/game-area-spells").then(({ listAreaSpellsAction }) => listAreaSpellsAction(sessionId)).then((result) => (result.ok ? result.value : null)).catch(() => null);
  spellLists.set(sessionId, loading);
  void loading.then((list) => list === null && spellLists.delete(sessionId));
  return loading;
}

/// Цілі обирають дотиком по токену на будь-якій мапі; зону заклинання ставлять лише там, де є сітка.
export function registerReadyMapBoard(sessionId: number, hasGrid: boolean) {
  const releases = [countMapBoard(readyMapBoards, sessionId), hasGrid ? countMapBoard(griddedMapBoards, sessionId) : null];
  return () => releases.forEach((release) => release?.());
}

function countMapBoard(boards: Map<number, number>, sessionId: number) {
  boards.set(sessionId, (boards.get(sessionId) ?? 0) + 1);
  return () => {
    const left = (boards.get(sessionId) ?? 1) - 1;
    if (left > 0) boards.set(sessionId, left);
    else boards.delete(sessionId);
  };
}

/// Кімната, у якій зараз відкрита мапа; поза нею кидок іде як звичайно.
export function findMapRoomId({ needsGrid = false }: { needsGrid?: boolean } = {}): number | null {
  const sessionId = useGameSessionLiveStore.getState().view?.id ?? null;
  if (sessionId === null || useGameSessionStore.getState().active?.id !== sessionId) return null;
  return (needsGrid ? griddedMapBoards : readyMapBoards).has(sessionId) ? sessionId : null;
}

/// Лоток минулого кидка закрив би панель вибору з кнопкою «Кинути».
export function showMapForPicking() {
  useDiceUIStore.getState().close();
  showRoomTab("map");
}

/// Кидок з ряткидком і областю (заклинання чи подих істоти) спершу просить поставити зону на мапі.
export async function startAreaCast(roll: DiceRollContext): Promise<boolean> {
  const sessionId = findCastSessionId(roll);
  const area = sessionId === null ? null : await findCastArea(sessionId, roll);
  if (sessionId === null || !area) return false;
  useAreaCastStore.setState({ cast: { sessionId, roll, area, isPlaced: false } });
  showMapForPicking();
  return true;
}

export const canCastOnArea = (roll: DiceRollContext) => findCastSessionId(roll) !== null;

function findCastSessionId(roll: DiceRollContext): number | null {
  const save = roll.targetSave;
  const hasSaveEffect = Boolean(findPressedAction(roll)?.targetSave || save?.effect || (save?.spell && findSpellSaveDamage(save.spell)));
  return hasSaveEffect ? findMapRoomId({ needsGrid: true }) : null;
}

async function findCastArea(sessionId: number, roll: DiceRollContext): Promise<CastArea | null> {
  if (roll.targetArea) return { name: roll.targetArea.label, shape: roll.targetArea.shape, sizeFeet: roll.targetArea.sizeFeet };
  const engName = roll.targetSave?.spell?.engName;
  return (engName && (await loadAreaSpells(sessionId))?.spells.find((spell) => spell.engName === engName)) || null;
}

/// Перша мапа, що побачила каст, ставить зону; друга (на весь екран) його вже не підхопить.
export function placeAreaCast(sessionId: number): AreaCast | null {
  const cast = useAreaCastStore.getState().cast;
  if (!cast || cast.isPlaced || cast.sessionId !== sessionId) return null;
  useAreaCastStore.setState({ cast: { ...cast, isPlaced: true } });
  return cast;
}

export function dropAreaCast() {
  useAreaCastStore.setState({ cast: null });
}

/// Кидок шкоди чи ряткидка йде одразу: зону вже обрано, тож панель лише показує результат.
export function castOnArea(cast: AreaCast, targets: RollTargets) {
  dropAreaCast();
  const damage = findPressedAction(cast.roll)?.targetSave ? undefined : cast.roll.actions.find((action) => findGameRollKind(action) === "damage");
  useDiceUIStore.getState().openRoll({ ...cast.roll, areaTargets: targets, ...(damage ? { autoRollKey: damage.key } : {}) });
}
