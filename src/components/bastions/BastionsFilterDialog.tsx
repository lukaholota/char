"use client";

import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import { type BastionOrder, type BastionSpace, translateOrder, translateSpace } from "@/lib/bastion-facility";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";

const ORDERS: BastionOrder[] = ["craft", "empower", "harvest", "recruit", "research", "trade"];
const SPACES: BastionSpace[] = ["cramped", "roomy", "vast"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedOrders: Set<string>;
  toggleOrder: (order: string) => void;
  selectedSpaces: Set<string>;
  toggleSpace: (space: string) => void;
  noPrerequisiteOnly: boolean;
  toggleNoPrerequisite: () => void;
  availableSources: CatalogSources;
  sourceSelection: SourceSelection;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  clearFilters: () => void;
};

export function BastionsFilterDialog({
  open,
  onOpenChange,
  selectedOrders,
  toggleOrder,
  selectedSpaces,
  toggleSpace,
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
      title="Фільтри приміщень бастіону"
      is2024
      onClear={clearFilters}
    >
      <FilterGroup title="Наказ">
        {ORDERS.map((order) => (
          <FilterChip
            key={order}
            is2024
            selected={selectedOrders.has(order)}
            onClick={() => toggleOrder(order)}
            label={translateOrder(order)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Простір">
        {SPACES.map((space) => (
          <FilterChip
            key={space}
            is2024
            selected={selectedSpaces.has(space)}
            onClick={() => toggleSpace(space)}
            label={translateSpace(space)}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Передумови">
        <FilterChip is2024 selected={noPrerequisiteOnly} onClick={toggleNoPrerequisite} label="Без передумов" />
      </FilterGroup>

      <SourceFilterSection
        is2024
        available={availableSources}
        selection={sourceSelection}
        onToggleSource={toggleSource}
        onToggleHomebrew={toggleHomebrew}
      />
    </CatalogFilterDialog>
  );
}
