"use client";

import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";
import { abilityTranslations, skillTranslations } from "@/lib/refs/translation";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024: boolean;
  availableSkills: string[];
  selectedSkills: Set<string>;
  toggleSkill: (skill: string) => void;
  availableAbilities: string[];
  selectedAbilities: Set<string>;
  toggleAbility: (ability: string) => void;
  availableSources: CatalogSources;
  sourceSelection: SourceSelection;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  clearFilters: () => void;
};

export function BackgroundsFilterDialog({
  open,
  onOpenChange,
  is2024,
  availableSkills,
  selectedSkills,
  toggleSkill,
  availableAbilities,
  selectedAbilities,
  toggleAbility,
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
      title="Фільтри походжень"
      is2024={is2024}
      onClear={clearFilters}
    >
      {availableAbilities.length > 0 && (
        <FilterGroup title="Характеристики">
          {availableAbilities.map((ability) => (
            <FilterChip
              key={ability}
              is2024={is2024}
              selected={selectedAbilities.has(ability)}
              onClick={() => toggleAbility(ability)}
              label={abilityTranslations[ability] || ability}
            />
          ))}
        </FilterGroup>
      )}

      {availableSkills.length > 0 && (
        <FilterGroup title="Навички">
          {availableSkills.map((skill) => (
            <FilterChip
              key={skill}
              is2024={is2024}
              selected={selectedSkills.has(skill)}
              onClick={() => toggleSkill(skill)}
              label={skillTranslations[skill] || skill}
            />
          ))}
        </FilterGroup>
      )}

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
