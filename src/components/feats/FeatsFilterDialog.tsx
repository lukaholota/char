"use client";

import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";
import { featCategoryTranslations } from "@/lib/refs/translation";

const CATEGORIES = ["ORIGIN", "GENERAL", "EPIC_BOON", "FIGHTING_STYLE"] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024: boolean;
  selectedCategories: Set<string>;
  toggleCategory: (cat: string) => void;
  repeatableOnly: boolean;
  toggleRepeatable: () => void;
  noPrerequisiteOnly: boolean;
  toggleNoPrerequisite: () => void;
  availableSources: CatalogSources;
  sourceSelection: SourceSelection;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  clearFilters: () => void;
};

export function FeatsFilterDialog({
  open,
  onOpenChange,
  is2024,
  selectedCategories,
  toggleCategory,
  repeatableOnly,
  toggleRepeatable,
  noPrerequisiteOnly,
  toggleNoPrerequisite,
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
      title="Фільтри рис"
      is2024={is2024}
      onClear={clearFilters}
    >
      <FilterGroup title="Категорія">
        {CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            is2024={is2024}
            selected={selectedCategories.has(cat)}
            onClick={() => toggleCategory(cat)}
            label={featCategoryTranslations[cat]}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Особливості">
        <FilterChip
          is2024={is2024}
          selected={repeatableOnly}
          onClick={toggleRepeatable}
          label="Можна брати кілька разів"
        />
        <FilterChip
          is2024={is2024}
          selected={noPrerequisiteOnly}
          onClick={toggleNoPrerequisite}
          label="Без вимог"
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
