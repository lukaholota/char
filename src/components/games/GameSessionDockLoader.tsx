"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { followOtherTabs, useGameSessionStore } from "@/lib/stores/gameSessionStore";

const GameSessionDock = dynamic(() => import("./GameSessionDock").then((module) => module.GameSessionDock), { ssr: false });

/// Без активної кімнати код журналу не вантажиться зовсім — кубики працюють як раніше.
export function GameSessionDockLoader() {
  const hasRoom = useGameSessionStore((state) => state.isHydrated && (state.active !== null || state.viewedRoomId !== null));
  useEffect(() => followOtherTabs(), []);
  return hasRoom ? <GameSessionDock /> : null;
}
