import type { ReactNode } from "react";
import type { SourceSelection } from "@/lib/catalog-source-filter";
import type { HomebrewSort } from "@/lib/logic/homebrew-catalog";

export type HomebrewOnlyCatalog = { header: ReactNode; sort: HomebrewSort };

export function includeHomebrewSource<T extends { source: SourceSelection }>(selection: T): T {
  return { ...selection, source: { ...selection.source, homebrew: true } };
}
