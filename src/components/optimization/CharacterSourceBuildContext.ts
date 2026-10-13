"use client";

import { createContext, useContext } from "react";

export type CharacterSourceBuild = { sourceBuildId: string | null; guide: { title: string; href: string } | null };

export const CharacterSourceBuildContext = createContext<CharacterSourceBuild | null>(null);

export function useCharacterSourceBuild() {
  return useContext(CharacterSourceBuildContext);
}
