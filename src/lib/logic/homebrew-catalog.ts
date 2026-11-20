import type { HomebrewKind } from "./homebrew-input";

export type HomebrewSort = "TOP" | "NEW";

type CatalogAddress = { kind: HomebrewKind; is2024: boolean; sort?: HomebrewSort; entryId?: number };

export function parseHomebrewKind(raw: string | string[] | undefined): HomebrewKind {
  return raw === "CREATURE" || raw === "ITEM" ? raw : "SPELL";
}

export function parseHomebrewSort(raw: string | string[] | null | undefined): HomebrewSort {
  return raw === "new" ? "NEW" : "TOP";
}

const MAX_STORED_ID = 2_147_483_647;

/// Краулери ходять по шаблонних рядках із бандла (`/homebrew/${…}`) — такий id має давати 404, а не падіння Prisma.
export function parseHomebrewEntryId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const entryId = Number(raw);
  return entryId > 0 && entryId <= MAX_STORED_ID ? entryId : null;
}

export function buildHomebrewEntryKey(entryId: number): string {
  return `homebrew-${entryId}`;
}

export function findHomebrewEntryId(key: string): number | null {
  const match = /^homebrew-(\d+)$/.exec(key);
  return match ? Number(match[1]) : null;
}

export function buildHomebrewCatalogHref({ kind, is2024, sort = "TOP", entryId }: CatalogAddress): string {
  const params = new URLSearchParams({ kind });
  if (sort === "NEW") params.set("hbsort", "new");
  if (entryId !== undefined) params.set(...buildSelectedEntryParam(kind, entryId));
  return `${is2024 ? "/2024" : ""}/homebrew?${params}`;
}

function buildSelectedEntryParam(kind: HomebrewKind, entryId: number): [string, string] {
  if (kind === "SPELL") return ["spell", String(-entryId)];
  return [kind === "ITEM" ? "item" : "creature", buildHomebrewEntryKey(entryId)];
}

/// Хоумбрю-предмет лежить у magic_item поруч із каталогом; службова англійська назва відрізняє його від офіційних.
export const HOMEBREW_ITEM_ENG_NAME_PREFIX = "homebrew:";

export function buildHomebrewItemEngName(entryId: number): string {
  return `${HOMEBREW_ITEM_ENG_NAME_PREFIX}${entryId}`;
}

export function isHomebrewItemEngName(engName: string | null | undefined): boolean {
  return engName?.startsWith(HOMEBREW_ITEM_ENG_NAME_PREFIX) ?? false;
}
