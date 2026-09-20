"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SheetStatesControl } from "./useSheetStates";

const SheetStatesContext = createContext<SheetStatesControl | null>(null);

export function SheetStatesProvider({ control, children }: { control: SheetStatesControl; children: ReactNode }) {
  return <SheetStatesContext.Provider value={control}>{children}</SheetStatesContext.Provider>;
}

/// Слайди й шапка листа беруть стани звідси — без протягування пропсів крізь великі файли.
export function useSheetStatesContext(): SheetStatesControl | null {
  return useContext(SheetStatesContext);
}
