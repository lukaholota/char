import type { HomebrewKind } from "./homebrew-input";

export type HomebrewSort = "TOP" | "NEW";

type CatalogAddress = { kind: HomebrewKind; is2024: boolean; sort?: HomebrewSort; entryId?: number };

export function parseHomebrewKind(raw: string | string[] | undefined): HomebrewKind {
  return raw === "CREATURE" ? "CREATURE" : "SPELL";
}

export function parseHomebrewSort(raw: string | string[] | null | undefined): HomebrewSort {
  return raw === "new" ? "NEW" : "TOP";
}

export function buildHomebrewCreatureKey(entryId: number): string {
  return `homebrew-${entryId}`;
}

export function buildHomebrewCatalogHref({ kind, is2024, sort = "TOP", entryId }: CatalogAddress): string {
  const params = new URLSearchParams({ kind });
  if (sort === "NEW") params.set("hbsort", "new");
  if (entryId !== undefined) params.set(...buildSelectedEntryParam(kind, entryId));
  return `${is2024 ? "/2024" : ""}/homebrew?${params}`;
}

function buildSelectedEntryParam(kind: HomebrewKind, entryId: number): [string, string] {
  return kind === "CREATURE" ? ["creature", buildHomebrewCreatureKey(entryId)] : ["spell", String(-entryId)];
}
