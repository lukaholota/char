"use client";

import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";
import { armorTypeTranslations } from "@/lib/refs/translation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024?: boolean;
  selectedTypes: Set<string>;
  toggleType: (type: string) => void;
  disadvantageOnly: boolean;
  toggleDisadvantage: () => void;
  hasStrengthReqOnly: boolean;
  toggleStrengthReq: () => void;
  availableSources: CatalogSources;
  sourceSelection: SourceSelection;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  clearFilters: () => void;
};

const ARMOR_TYPES = ["LIGHT", "MEDIUM", "HEAVY", "SHIELD"];

export function ArmorFilterDialog({
  open,
  onOpenChange,
  is2024 = false,
  selectedTypes,
  toggleType,
  disadvantageOnly,
  toggleDisadvantage,
  hasStrengthReqOnly,
  toggleStrengthReq,
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
      title="Фільтри обладунків"
      is2024={is2024}
      onClear={clearFilters}
    >
      <FilterGroup title="Тип обладунку">
        {ARMOR_TYPES.map((type) => (
          <FilterChip
            key={type}
            is2024={is2024}
            selected={selectedTypes.has(type)}
            onClick={() => toggleType(type)}
            label={armorTypeTranslations[type] || type}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Особливості">
        <FilterChip
          is2024={is2024}
          selected={disadvantageOnly}
          onClick={toggleDisadvantage}
          label="Лише з перешкодою на Непомітність"
        />
        <FilterChip
          is2024={is2024}
          selected={hasStrengthReqOnly}
          onClick={toggleStrengthReq}
          label="З вимогою до Сили"
        />
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
