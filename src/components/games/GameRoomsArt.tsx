"use client";

import type { ReactNode } from "react";
import { useIsArtHidden } from "@/components/no-ai/ContentImage";

export function GameRoomsArt({ children }: { children: ReactNode }) {
  return useIsArtHidden("/images/games/") ? null : children;
}
