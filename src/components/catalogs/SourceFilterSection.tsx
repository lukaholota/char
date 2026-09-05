"use client";

import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { hasCatalogSources, type CatalogSources, type SourceSelection } from "@/lib/catalog-source-filter";
import { findSourceLabel } from "@/lib/refs/source-label";

/// Секція «Джерело» для діалогу фільтрів будь-якого каталогу. Хоумбрю йде окремим перемикачем
/// після книжок і за замовчуванням вимкнене — див. `catalog-source-filter.ts`.
export function SourceFilterSection({
  is2024 = false,
  available,
  selection,
  onToggleSource,
  onToggleHomebrew,
}: {
  is2024?: boolean;
  available: CatalogSources;
  selection: SourceSelection;
  onToggleSource: (source: string) => void;
  onToggleHomebrew: () => void;
}) {
  if (!hasCatalogSources(available)) return null;

  return (
    <FilterGroup title="Джерело">
      {available.official.map((source) => (
        <FilterChip
          key={source}
          is2024={is2024}
          selected={selection.sources.has(source)}
          onClick={() => onToggleSource(source)}
          label={findSourceLabel(source)}
          title={source}
        />
      ))}
      {available.hasHomebrew ? (
        <FilterChip
          is2024={is2024}
          selected={selection.homebrew}
          onClick={onToggleHomebrew}
          label="Показувати хоумбрю"
          title="Хоумбрю приховано, поки цей перемикач вимкнений"
        />
      ) : null}
    </FilterGroup>
  );
}
