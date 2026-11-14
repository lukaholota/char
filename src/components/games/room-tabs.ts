"use client";

import { createContext } from "react";
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

export function findSideTab(sideTab: RoomSideTab | null, hasHeroTab: boolean): RoomSideTab {
  if (sideTab === "hero" && !hasHeroTab) return "journal";
  return sideTab ?? (hasHeroTab ? "hero" : "journal");
}

/// На найширших екранах журнал має свою колонку, тож третя показує героя або кімнату.
export function findWideSideTab(sideTab: RoomSideTab, hasHeroTab: boolean): Exclude<RoomSideTab, "journal"> {
  if (sideTab !== "journal") return sideTab;
  return hasHeroTab ? "hero" : "room";
}

/// На компʼютері панель інструмента мапи відкривається в бічній колонці, поверх аркуша героя, а не забирає місце в мапи.
export const ToolPanelSlotContext = createContext<HTMLElement | null>(null);
