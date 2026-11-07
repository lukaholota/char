"use client";

import { createContext, useContext, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { AreaDraft, AreaDraftStore, MapTool } from "./use-map-tools";

type SharedBoard = {
  tool: MapTool | null;
  setTool: (tool: MapTool | null) => void;
  area: AreaDraftStore;
  skippedKeys: string[];
  setSkippedKeys: Dispatch<SetStateAction<string[]>>;
  replacedAreaId: { current: number | null };
};

const SharedBoardContext = createContext<SharedBoard | null>(null);

/// Кімнатна й повноекранна мапа — дві дошки однієї сцени: інструмент, чернетка області й виключені цілі в них ті самі.
export function SharedBoardProvider({ children }: { children: ReactNode }) {
  const [tool, setTool] = useState<MapTool | null>(null);
  const [draft, setDraftState] = useState<AreaDraft | null>(null);
  const latestDraft = useRef<AreaDraft | null>(null);
  const [skippedKeys, setSkippedKeys] = useState<string[]>([]);
  const replacedAreaId = useRef<number | null>(null);
  const setDraft = (next: AreaDraft | null) => {
    latestDraft.current = next;
    setDraftState(next);
  };
  const board = { tool, setTool, area: { draft, latestDraft, setDraft }, skippedKeys, setSkippedKeys, replacedAreaId };
  return <SharedBoardContext.Provider value={board}>{children}</SharedBoardContext.Provider>;
}

export function useSharedBoard(): SharedBoard {
  const board = useContext(SharedBoardContext);
  if (!board) throw new Error("MapBoard must be inside SharedBoardProvider");
  return board;
}
