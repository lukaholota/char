"use client";

import { useContext } from "react";
import { createPortal } from "react-dom";
import { MapHintSlotContext } from "./room-tabs";
import type { SelectedToken, TokenPanelTab } from "./TokenTransformControls";
import type { MapTool } from "./use-map-tools";

export type MapHint = { keys: string; action: string };
export type MapHintState = { isGm: boolean; isArchived: boolean; tool: MapTool | null; isGroup: boolean; token: SelectedToken | null; tab: TokenPanelTab; isSide: boolean };
type MapHintsProps = MapHintState & { isFullscreen?: boolean };

const UNDO_TOOLS: MapTool[] = ["walls", "light", "objects", "draw", "fog"];
const TOOL_DRAGS: Partial<Record<MapTool, string>> = { ruler: "виміряти відстань", draw: "малювати", fog: "малювати туман", objects: "рамка для кількох" };

/// Підказки живуть у шапці кімнати: на компʼютері там порожньо, а мапа міняє їх під те, що зараз вибрано.
export function MapHints({ isFullscreen, ...state }: MapHintsProps) {
  const slot = useContext(MapHintSlotContext);
  if (!slot || isFullscreen) return null;
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  return createPortal(
    listMapHints(state, isMac).map((hint) => (
      <span key={hint.keys} className="inline-flex h-5 items-center gap-1 whitespace-nowrap">
        <kbd className="rounded border border-white/15 bg-white/5 px-1.5 font-[inherit] text-[0.7rem] leading-4 text-slate-200">{hint.keys}</kbd>
        {hint.action}
      </span>
    )),
    slot,
  );
}

/// Найважливіша підказка — перша: вузька шапка ховає кінець списку.
export function listMapHints(state: MapHintState, isMac: boolean): MapHint[] {
  const undo = { keys: isMac ? "⌘Z" : "Ctrl+Z", action: "скасувати" };
  const copy = { keys: isMac ? "⌘C ⌘V" : "Ctrl+C Ctrl+V", action: "копія" };
  if (state.isGroup) return listGroupHints(state.tool === "objects");
  const scatter = { keys: isMac ? "⇧⌘V" : "Ctrl+Shift+V", action: "копія з розкидом" };
  const picks = [{ keys: "Shift + клік", action: "додати до вибору" }, { keys: isMac ? "⌘ + клік" : "Ctrl + клік", action: "прибрати з вибору" }];
  if (state.tool) return listToolHints(state.tool, undo, copy, scatter, picks);
  if (state.token) return listTokenHints(state.token, state.tab, state.isSide, copy);
  if (state.isArchived) return [{ keys: "Тягни", action: "рухати мапу" }, { keys: "Колесо", action: "масштаб" }];
  if (state.isGm) return [{ keys: "Клік", action: "вибрати токен" }, ...picks, { keys: "Тягни по порожньому", action: "рамка для кількох" }, { keys: "ПКМ + тягни", action: "рухати мапу" }, { keys: "Колесо", action: "масштаб" }, { keys: "Утримати", action: "позначка для всіх" }, undo];
  return [{ keys: "Клік по своєму герою", action: "вибрати" }, { keys: "Тягни", action: "рухати мапу" }, { keys: "Колесо", action: "масштаб" }, { keys: "Утримати", action: "позначка для всіх" }];
}

function listGroupHints(areObjects: boolean): MapHint[] {
  return [{ keys: "Тягни будь-кого", action: "рухаються всі" }, { keys: "Delete", action: areObjects ? "видалити" : "прибрати з мапи" }, { keys: "Esc", action: "зняти вибір" }];
}

function listToolHints(tool: MapTool, undo: MapHint, copy: MapHint, scatter: MapHint, picks: MapHint[]): MapHint[] {
  const drag = TOOL_DRAGS[tool];
  return [
    ...(drag ? [{ keys: "Тягни", action: drag }] : []),
    ...(tool === "objects" ? picks : []),
    ...(UNDO_TOOLS.includes(tool) ? [undo] : []),
    ...(tool === "objects" || tool === "light" ? [copy] : []),
    ...(tool === "objects" ? [scatter] : []),
    { keys: "Esc", action: "закрити інструмент" },
    ...(tool === "walls" || tool === "area" ? [] : [{ keys: "Клік по токену", action: "вибрати його" }]),
  ];
}

function listTokenHints(token: SelectedToken, tab: TokenPanelTab, isSide: boolean, copy: MapHint): MapHint[] {
  const hasSheet = token.sheet !== null || token.showRoomSheet !== null;
  const againAction = !isSide ? `«${token.openLabel}»` : !hasSheet ? null : tab === "sheet" ? "налаштування токена" : `«${token.sheetLabel}»`;
  return [
    ...(againAction ? [{ keys: "Клік ще раз", action: againAction }] : []),
    { keys: "Тягни токен", action: "пересунути" },
    ...(token.remove ? [{ keys: "Delete", action: "прибрати з мапи" }] : []),
    ...(token.lightTarget.kind === "creature" ? [copy] : []),
    { keys: "Esc", action: "зняти вибір" },
  ];
}
