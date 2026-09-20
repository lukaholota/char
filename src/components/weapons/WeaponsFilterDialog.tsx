"use client";

import { CatalogFilterDialog } from "@/components/catalogs/CatalogFilterDialog";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";
import {
  weaponTypeTranslations,
  damageTypeTranslations,
  weaponPropertyTranslations,
} from "@/lib/refs/translation";
import { formatWeaponMasteryLabel, weaponMasteryNames } from "@/lib/refs/weapon-mastery";
import { WEAPON_REACH_LABELS, type WeaponReach } from "@/lib/weapon-filter-facets";
import { findAccentVariant } from "@/styles/edition-accent";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024?: boolean;
  selectedTypes: Set<string>;
  toggleType: (type: string) => void;
  selectedReaches: Set<string>;
  toggleReach: (reach: string) => void;
  selectedDamageTypes: Set<string>;
  toggleDamageType: (dt: string) => void;
  selectedProperties: Set<string>;
  toggleProperty: (prop: string) => void;
  selectedMasteries?: Set<string>;
  toggleMastery?: (mastery: string) => void;
  availableSources: CatalogSources;
  sourceSelection: SourceSelection;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  clearFilters: () => void;
};

const WEAPON_TYPES = ["SIMPLE_WEAPON", "MARTIAL_WEAPON", "FIREARMS"];
const DAMAGE_TYPES = ["SLASHING", "PIERCING", "BLUDGEONING", "RADIANT", "NECROTIC"];
const WEAPON_PROPERTIES = [
  "FINESSE",
  "LIGHT",
  "VERSATILE",
  "TWO_HANDED",
  "THROWN",
  "HEAVY",
  "REACH",
  "AMMUNITION",
  "LOADING",
];
const MASTERY_PROPERTIES = Object.keys(weaponMasteryNames);
const WEAPON_REACHES = Object.keys(WEAPON_REACH_LABELS) as WeaponReach[];

export function WeaponsFilterDialog({
  open,
  onOpenChange,
  is2024 = false,
  selectedTypes,
  toggleType,
  selectedReaches,
  toggleReach,
  selectedDamageTypes,
  toggleDamageType,
  selectedProperties,
  toggleProperty,
  selectedMasteries,
  toggleMastery,
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
      title="Фільтри зброї"
      is2024={is2024}
      onClear={clearFilters}
    >
      <FilterGroup title="Категорія зброї">
        {WEAPON_TYPES.map((type) => (
          <FilterChip
            key={type}
            is2024={is2024}
            selected={selectedTypes.has(type)}
            onClick={() => toggleType(type)}
            label={weaponTypeTranslations[type] || type}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Бій">
        {WEAPON_REACHES.map((reach) => (
          <FilterChip
            key={reach}
            is2024={is2024}
            selected={selectedReaches.has(reach)}
            onClick={() => toggleReach(reach)}
            label={WEAPON_REACH_LABELS[reach]}
          />
        ))}
      </FilterGroup>

      <FilterGroup title="Тип шкоди">
        {DAMAGE_TYPES.map((dt) => (
          <FilterChip
            key={dt}
            is2024={is2024}
            selected={selectedDamageTypes.has(dt)}
            onClick={() => toggleDamageType(dt)}
            label={damageTypeTranslations[dt] || dt}
          />
        ))}
      </FilterGroup>

      {is2024 && selectedMasteries && toggleMastery && (
        <FilterGroup title={<span className={findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-arcane-300" })}>Майстерність зброї (Weapon Mastery 2024)</span>}>
          {MASTERY_PROPERTIES.map((m) => (
            <FilterChip
              key={m}
              is2024
              selected={selectedMasteries.has(m)}
              onClick={() => toggleMastery(m)}
              label={formatWeaponMasteryLabel(m) ?? m}
            />
          ))}
        </FilterGroup>
      )}

      <FilterGroup title="Властивості">
        {WEAPON_PROPERTIES.map((prop) => (
          <FilterChip
            key={prop}
            is2024={is2024}
            selected={selectedProperties.has(prop)}
            onClick={() => toggleProperty(prop)}
            label={weaponPropertyTranslations[prop] || prop}
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
