"use client";

import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024?: boolean;
  selectedLevels: Set<number>;
  toggleLevel: (lvl: number) => void;
  selectedPacts: Set<string>;
  togglePact: (pact: string) => void;
  noRequirementsOnly: boolean;
  toggleNoRequirements: () => void;
  availableSources: CatalogSources;
  sourceSelection: SourceSelection;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  clearFilters: () => void;
};

const WARLOCK_LEVELS = [2, 5, 7, 9, 12, 15];

const PACT_BOONS = [
  { key: "Pact of the Blade", label: "Пакт клинка (Blade)" },
  { key: "Pact of the Tome", label: "Пакт гримуара (Tome)" },
  { key: "Pact of the Chain", label: "Пакт ланцюга (Chain)" },
  { key: "Pact of the Talisman", label: "Пакт талісмана (Talisman)" },
];

export function InvocationsFilterDialog({
  open,
  onOpenChange,
  is2024 = false,
  selectedLevels,
  toggleLevel,
  selectedPacts,
  togglePact,
  noRequirementsOnly,
  toggleNoRequirements,
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
      title="Фільтри відозв чаклуна"
      is2024={is2024}
      onClear={clearFilters}
    >
      <FilterGroup title="Вимога до рівня чаклуна">
        {WARLOCK_LEVELS.map((lvl) => (
          <FilterChip
            key={lvl}
            is2024={is2024}
            selected={selectedLevels.has(lvl)}
            onClick={() => toggleLevel(lvl)}
            label={`Рівень ${lvl}+`}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Вимога до дару пакту">
        {PACT_BOONS.map((pact) => (
          <FilterChip
            key={pact.key}
            is2024={is2024}
            selected={selectedPacts.has(pact.key)}
            onClick={() => togglePact(pact.key)}
            label={pact.label}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Особливості">
        <FilterChip
          is2024={is2024}
          selected={noRequirementsOnly}
          onClick={toggleNoRequirements}
          label="Без жодних вимог"
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
