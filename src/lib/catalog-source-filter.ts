import { getParamSet, setParamSet } from "@/lib/catalog-url-helpers";
import { findSourceLabel } from "@/lib/refs/source-label";

/// Фільтр за джерелом, спільний для всіх каталогів. Хоумбрю — не одна з книжок: за замовчуванням
/// каталог показує лише офіційний вміст, а хоумбрю вмикається окремим перемикачем (`hb=1`).
/// Список книжок у чипах його не містить, тож «вибрати MM» ніколи не підтягне хоумбрю.

const HOMEBREW_SOURCE = "HOMEBREW";

export type SourceSelection = {
  sources: Set<string>;
  homebrew: boolean;
};

export type CatalogSources = {
  official: string[];
  hasHomebrew: boolean;
};

function isHomebrewSource(source: string | null | undefined): boolean {
  return (source ?? "").trim().toUpperCase() === HOMEBREW_SOURCE;
}

export function collectCatalogSources(items: readonly { source?: string | null }[]): CatalogSources {
  const official = new Set<string>();
  let hasHomebrew = false;

  for (const item of items) {
    const source = (item.source ?? "").trim();
    if (!source) continue;
    if (isHomebrewSource(source)) hasHomebrew = true;
    else official.add(source);
  }

  return {
    official: Array.from(official).sort((a, b) =>
      findSourceLabel(a).localeCompare(findSourceLabel(b), "uk")
    ),
    hasHomebrew,
  };
}

export function hasCatalogSources(sources: CatalogSources): boolean {
  return sources.official.length > 0 || sources.hasHomebrew;
}

export function matchesSourceSelection(
  source: string | null | undefined,
  selection: SourceSelection
): boolean {
  const value = (source ?? "").trim();
  if (isHomebrewSource(value) && !selection.homebrew) return false;
  if (selection.sources.size > 0 && !selection.sources.has(value)) return false;
  return true;
}

export function parseSourceSelection(params: URLSearchParams): SourceSelection {
  return {
    sources: getParamSet(params, "src"),
    homebrew: params.get("hb") === "1",
  };
}

export function toggleSourceParam(params: URLSearchParams, source: string): void {
  const set = getParamSet(params, "src");
  if (set.has(source)) set.delete(source);
  else set.add(source);
  setParamSet(params, "src", set);
}

export function toggleHomebrewParam(params: URLSearchParams): void {
  if (params.get("hb") === "1") params.delete("hb");
  else params.set("hb", "1");
}

export function enableHomebrewParam(params: URLSearchParams): void {
  params.set("hb", "1");
}

export function clearSourceParams(params: URLSearchParams): void {
  params.delete("src");
  params.delete("hb");
}

export function countSourceFilters(selection: SourceSelection): number {
  return selection.sources.size + (selection.homebrew ? 1 : 0);
}
