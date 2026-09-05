"use client";

import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";
import { INFUSION_EFFECT_LABELS, type InfusionEffect } from "@/lib/infusion-filter-facets";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLevels: Set<number>;
  toggleLevel: (lvl: number) => void;
  selectedTargets: Set<string>;
  toggleTarget: (target: string) => void;
  attunementOnly: boolean;
  toggleAttunement: () => void;
  availableEffects: InfusionEffect[];
  selectedEffects: Set<string>;
  toggleEffect: (effect: InfusionEffect) => void;
  availableSources: CatalogSources;
  sourceSelection: SourceSelection;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  clearFilters: () => void;
};

const ARTIFICER_LEVELS = [2, 6, 10, 14];

const TARGET_TYPES: { key: string; label: string }[] = [
  { key: "WEAPON", label: "Зброя" },
  { key: "ARMOR", label: "Обладунок" },
  { key: "SHIELD", label: "Щит" },
  { key: "RING", label: "Перстень" },
  { key: "BOOTS", label: "Чоботи" },
  { key: "HELMET", label: "Шолом" },
  { key: "WAND_ROD_STAFF", label: "Фокуси" },
  { key: "ANY", label: "Репліка предмета / Будь-який" },
];

export function InfusionsFilterDialog({
  open,
  onOpenChange,
  selectedLevels,
  toggleLevel,
  selectedTargets,
  toggleTarget,
  attunementOnly,
  toggleAttunement,
  availableEffects,
  selectedEffects,
  toggleEffect,
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
      title="Фільтри вливань винахідника"
      onClear={clearFilters}
    >
      <FilterGroup title="Мінімальний рівень винахідника">
        {ARTIFICER_LEVELS.map((lvl) => (
          <FilterChip
            key={lvl}
            selected={selectedLevels.has(lvl)}
            onClick={() => toggleLevel(lvl)}
            label={`Рівень ${lvl}+`}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Тип цільового предмета">
        {TARGET_TYPES.map((tt) => (
          <FilterChip
            key={tt.key}
            selected={selectedTargets.has(tt.key)}
            onClick={() => toggleTarget(tt.key)}
            label={tt.label}
          />
        ))}
      </FilterGroup>

      {availableEffects.length > 0 && (
        <FilterGroup title="Ефект">
          {availableEffects.map((effect) => (
            <FilterChip
              key={effect}
              selected={selectedEffects.has(effect)}
              onClick={() => toggleEffect(effect)}
              label={INFUSION_EFFECT_LABELS[effect]}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Налаштування">
        <FilterChip
          selected={attunementOnly}
          onClick={toggleAttunement}
          label="Лише ті, що потребують налаштування"
        />
      </FilterGroup>

      <SourceFilterSection
        available={availableSources}
        selection={sourceSelection}
        onToggleSource={toggleSource}
        onToggleHomebrew={toggleHomebrew}
      />
    </CatalogFilterDialog>
  );
}
