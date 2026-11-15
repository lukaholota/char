"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { create } from "zustand";

export type RoomTab = "map" | "hero" | "journal" | "room";
export type RoomSideTab = Exclude<RoomTab, "map">;

/// sideShownCount росте з кожним показом бічної вкладки, навіть уже відкритої: так мапа знає, що панель інструмента пора прибрати з дороги.
type RoomTabState = { tab: RoomTab; sideTab: RoomSideTab | null; isSideFolded: boolean; sideShownCount: number };

/// На телефоні видно одну вкладку, на компʼютері мапа завжди поруч, тож бічна памʼятає свій вибір окремо.
export const useRoomTabStore = create<RoomTabState>(() => ({ tab: "map", sideTab: null, isSideFolded: false, sideShownCount: 0 }));

export function showRoomTab(tab: RoomTab) {
  useRoomTabStore.setState((state) => (tab === "map" ? { tab } : { tab, sideTab: tab, isSideFolded: false, sideShownCount: state.sideShownCount + 1 }));
}

export function resetRoomTabs() {
  useRoomTabStore.setState({ tab: "map", sideTab: null, isSideFolded: false });
}

/// На компʼютері бічну панель можна згорнути в колонку іконок, щоб мапа забрала її ширину.
export function foldSidePanel(isSideFolded: boolean) {
  useRoomTabStore.setState({ isSideFolded });
}

export function findSideTab(sideTab: RoomSideTab | null, hasHeroTab: boolean, isJournalDocked: boolean): RoomSideTab {
  const fallback: RoomSideTab = hasHeroTab ? "hero" : isJournalDocked ? "room" : "journal";
  if (sideTab === "hero" && !hasHeroTab) return fallback;
  if (sideTab === "journal" && isJournalDocked) return fallback;
  return sideTab ?? fallback;
}


/// На компʼютері панель інструмента мапи відкривається в бічній колонці, поверх аркуша героя, а не забирає місце в мапи.
export const ToolPanelSlotContext = createContext<HTMLElement | null>(null);

/// Місце в шапці кімнати для підказок мапи: на компʼютері там вільно між назвою й перемикачем сцени.
export const MapHintSlotContext = createContext<HTMLElement | null>(null);

/// Місце в шапці листа героя для кнопки «Токен»: на компʼютері перший дотик показує лист, і без неї налаштування токена не видно.
export const HeroTokenSlotContext = createContext<HTMLElement | null>(null);

/// Слот у бічній колонці є лише на компʼютері з розгорнутою колонкою і не на весь екран. Показ будь-якої бічної вкладки прибирає панель, що її закривала; порожній слот нічого не закриває, тож вибраний герой із листом лишається вибраним.
export function useToolPanelSlot(isFullscreen: boolean | undefined, closeTool: () => void): HTMLElement | null {
  const slot = useContext(ToolPanelSlotContext);
  const panelSlot = isFullscreen ? null : slot;
  const sideShownCount = useRoomTabStore((state) => state.sideShownCount);
  const seenCount = useRef(sideShownCount);
  useEffect(() => {
    if (seenCount.current === sideShownCount) return;
    seenCount.current = sideShownCount;
    if (panelSlot?.hasChildNodes()) closeTool();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- закриває лише новий показ вкладки
  }, [sideShownCount]);
  return panelSlot;
}
