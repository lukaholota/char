"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { itemRarityTranslations, magicItemTypeTranslations } from "@/lib/refs/translation";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import { hasCatalogSources, type CatalogSources, type SourceSelection } from "@/lib/catalog-source-filter";
import { MAGIC_ITEM_TRAIT_LABELS, type MagicItemTrait } from "@/lib/magic-item-traits";
import { cn } from "@/lib/utils";

const rarityLabel = (rarity: string) =>
  itemRarityTranslations[rarity as keyof typeof itemRarityTranslations] || rarity;

const typeLabel = (type: string) =>
  magicItemTypeTranslations[type as keyof typeof magicItemTypeTranslations] || type;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024?: boolean;
  availableRarities: string[];
  availableTypes: string[];
  availableTraits: MagicItemTrait[];
  availableSources: CatalogSources;
  selectedRarities: Set<string>;
  selectedTypes: Set<string>;
  selectedTraits: Set<string>;
  sourceSelection: SourceSelection;
  selectedAttunement: boolean | null;
  toggleRarity: (rarity: string) => void;
  toggleType: (type: string) => void;
  toggleTrait: (trait: MagicItemTrait) => void;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  setAttunement: (value: boolean | null) => void;
  clearFilters: () => void;
};

export function MagicItemsFilterDialog({
  open,
  onOpenChange,
  is2024 = false,
  availableRarities,
  availableTypes,
  availableTraits,
  availableSources,
  selectedRarities,
  selectedTypes,
  selectedTraits,
  sourceSelection,
  selectedAttunement,
  toggleRarity,
  toggleType,
  toggleTrait,
  toggleSource,
  toggleHomebrew,
  setAttunement,
  clearFilters,
}: Props) {
  const activeBadgeClass = is2024
    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
    : "bg-arcane-500/15 text-arcane-300 border-arcane-500/30";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto p-0" showClose={false}>
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle
              className={cn(
                "font-rpg-display text-2xl font-semibold tracking-wide",
                is2024 ? "text-amber-400" : "text-arcane-400"
              )}
            >
              Фільтри
            </DialogTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="glass-panel inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/50 text-slate-200/90 hover:text-slate-100"
              aria-label="Закрити"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {/* Rarity */}
            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Рідкість</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableRarities.map((rar) => {
                  const active = selectedRarities.has(rar);
                  return (
                    <Badge
                      key={rar}
                      variant={active ? "default" : "outline"}
                      className={cn("cursor-pointer transition-colors", active ? activeBadgeClass : "")}
                      onClick={() => toggleRarity(rar)}
                      role="button"
                    >
                      {rarityLabel(rar)}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Type */}
            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Тип</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTypes.map((t) => {
                  const active = selectedTypes.has(t);
                  return (
                    <Badge
                      key={t}
                      variant={active ? "default" : "outline"}
                      className={cn("cursor-pointer transition-colors", active ? activeBadgeClass : "")}
                      onClick={() => toggleType(t)}
                      role="button"
                    >
                      {typeLabel(t)}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Attunement */}
            <div className="glass-panel rounded-xl border border-white/10 p-3">
              <div className="text-xs font-semibold text-slate-300">Налаштування</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge
                  variant={selectedAttunement === true ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedAttunement === true ? activeBadgeClass : ""
                  )}
                  onClick={() => setAttunement(selectedAttunement === true ? null : true)}
                  role="button"
                >
                  Потрібне
                </Badge>
                <Badge
                  variant={selectedAttunement === false ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedAttunement === false ? activeBadgeClass : ""
                  )}
                  onClick={() => setAttunement(selectedAttunement === false ? null : false)}
                  role="button"
                >
                  Не потрібне
                </Badge>
              </div>
            </div>

            {availableTraits.length > 0 && (
              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <div className="text-xs font-semibold text-slate-300">Особливості</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableTraits.map((trait) => {
                    const active = selectedTraits.has(trait);
                    return (
                      <Badge
                        key={trait}
                        variant={active ? "default" : "outline"}
                        className={cn("cursor-pointer transition-colors", active ? activeBadgeClass : "")}
                        onClick={() => toggleTrait(trait)}
                        role="button"
                      >
                        {MAGIC_ITEM_TRAIT_LABELS[trait]}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {hasCatalogSources(availableSources) && (
              <div className="glass-panel rounded-xl border border-white/10 p-3">
                <SourceFilterSection
                  is2024={is2024}
                  available={availableSources}
                  selection={sourceSelection}
                  onToggleSource={toggleSource}
                  onToggleHomebrew={toggleHomebrew}
                />
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                className="border border-white/10 bg-slate-900/40"
                onClick={clearFilters}
              >
                Очистити
              </Button>
              <Button
                type="button"
                className={cn("border font-medium", is2024 ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-arcane-500/20 text-arcane-300 border-arcane-500/40")}
                onClick={() => onOpenChange(false)}
              >
                Застосувати
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
