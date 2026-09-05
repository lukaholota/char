"use client";

import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";
import { NO_SPELLCASTING_KEY } from "@/lib/class-filter-facets";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024: boolean;
  availableHitDice: number[];
  selectedHitDice: Set<string>;
  toggleHitDie: (hitDie: string) => void;
  availableSpellcasting: string[];
  selectedSpellcasting: Set<string>;
  toggleSpellcasting: (kind: string) => void;
  availableSources: CatalogSources;
  sourceSelection: SourceSelection;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  clearFilters: () => void;
};

export function ClassesFilterDialog({
  open,
  onOpenChange,
  is2024,
  availableHitDice,
  selectedHitDice,
  toggleHitDie,
  availableSpellcasting,
  selectedSpellcasting,
  toggleSpellcasting,
  availableSources,
  sourceSelection,
  toggleSource,
  toggleHomebrew,
  clearFilters,
}: Props) {
  return (
    <CatalogFilterDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Фільтри класів"
      is2024={is2024}
      onClear={clearFilters}
    >
      <FilterGroup title="Кістка хітів">
        {availableHitDice.map((hitDie) => (
          <FilterChip
            key={hitDie}
            is2024={is2024}
            selected={selectedHitDice.has(String(hitDie))}
            onClick={() => toggleHitDie(String(hitDie))}
            label={`к${hitDie}`}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Чарування">
        {availableSpellcasting.map((kind) => (
          <FilterChip
            key={kind}
            is2024={is2024}
            selected={selectedSpellcasting.has(kind)}
            onClick={() => toggleSpellcasting(kind)}
            label={kind === NO_SPELLCASTING_KEY ? "Без чарів" : kind}
          />
        ))}
      </FilterGroup>

      <SourceFilterSection
        is2024={is2024}
        available={availableSources}
        selection={sourceSelection}
        onToggleSource={toggleSource}
        onToggleHomebrew={toggleHomebrew}
      />
    </CatalogFilterDialog>
  );
}
