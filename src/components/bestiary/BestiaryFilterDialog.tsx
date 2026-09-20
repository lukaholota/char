"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FilterChip, FilterGroup } from "@/components/catalogs/FilterChip";
import { SourceFilterSection } from "@/components/catalogs/SourceFilterSection";
import { CREATURE_MOVE_LABELS, type CreatureMove } from "@/lib/bestiary-index";
import type { CatalogSources, SourceSelection } from "@/lib/catalog-source-filter";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

const CREATURE_MOVES = Object.keys(CREATURE_MOVE_LABELS) as CreatureMove[];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  is2024: boolean;
  availableTypes: string[];
  selectedTypes: Set<string>;
  toggleType: (type: string) => void;
  availableSizes: string[];
  selectedSizes: Set<string>;
  toggleSize: (size: string) => void;
  availableCRs: string[];
  selectedCRs: Set<string>;
  toggleCR: (cr: string) => void;
  availableSources: CatalogSources;
  sourceSelection: SourceSelection;
  toggleSource: (source: string) => void;
  toggleHomebrew: () => void;
  selectedMoves: Set<string>;
  toggleMove: (move: CreatureMove) => void;
  clearFilters: () => void;
  /// Секція Дикої форми приходить слотом: діалог фільтрів не має знати ані про друїдів, ані про
  /// сервер — він лише дає їй місце серед звичайних фільтрів каталогу.
  extraSection?: ReactNode;
};

export function BestiaryFilterDialog({
  open,
  onOpenChange,
  is2024,
  availableTypes,
  selectedTypes,
  toggleType,
  availableSizes,
  selectedSizes,
  toggleSize,
  availableCRs,
  selectedCRs,
  toggleCR,
  availableSources,
  sourceSelection,
  toggleSource,
  toggleHomebrew,
  selectedMoves,
  toggleMove,
  clearFilters,
  extraSection,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg border-white/10 bg-slate-950/95 p-6 backdrop-blur-2xl text-slate-100 max-h-[85vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogTitle className="font-rpg-display text-lg uppercase tracking-wider text-slate-200">
          Фільтри бестіарію
        </DialogTitle>

        <div className="mt-4 space-y-5">
          {extraSection}

          {/* CR (Небезпека) */}
          {availableCRs.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Показник небезпеки (ПН)
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {availableCRs.map((cr) => {
                  const isSelected = selectedCRs.has(cr);
                  return (
                    <button
                      key={cr}
                      onClick={() => toggleCR(cr)}
                      className={cn(
                        "flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-mono font-medium border transition-all text-center",
                        isSelected
                          ? findAccentVariant(is2024, { prism: "border-prism-500/50 bg-prism-500/20 text-prism-200 font-bold", arcane: "border-arcane-500/50 bg-arcane-500/20 text-arcane-200 font-bold" })
                          : "border-white/5 bg-slate-900/60 text-slate-300 hover:bg-white/5"
                      )}
                    >
                      {cr === "-" ? "Саммон" : `CR ${cr}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Creature Type */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Тип істоти
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {availableTypes.map((type) => {
                const isSelected = selectedTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium border transition-all text-left truncate",
                      isSelected
                        ? findAccentVariant(is2024, { prism: "border-prism-500/50 bg-prism-500/20 text-prism-200", arcane: "border-arcane-500/50 bg-arcane-500/20 text-arcane-200" })
                        : "border-white/5 bg-slate-900/60 text-slate-300 hover:bg-white/5"
                    )}
                  >
                    <span className="truncate">{type}</span>
                    {isSelected && <span className="text-xs shrink-0 ml-1">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size */}
          {availableSizes.length > 0 && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Розмір
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {availableSizes.map((size) => {
                  const isSelected = selectedSizes.has(size);
                  return (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={cn(
                        "flex items-center justify-center rounded-xl px-2.5 py-1.5 text-xs font-medium border transition-all text-center truncate",
                        isSelected
                          ? findAccentVariant(is2024, { prism: "border-prism-500/50 bg-prism-500/20 text-prism-200", arcane: "border-arcane-500/50 bg-arcane-500/20 text-arcane-200" })
                          : "border-white/5 bg-slate-900/60 text-slate-300 hover:bg-white/5"
                      )}
                    >
                      <span className="truncate">{size}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <FilterGroup title="Пересування">
            {CREATURE_MOVES.map((move) => (
              <FilterChip
                key={move}
                is2024={is2024}
                selected={selectedMoves.has(move)}
                onClick={() => toggleMove(move)}
                label={CREATURE_MOVE_LABELS[move]}
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
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-slate-400">
            Скинути все
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className={cn(
              "rounded-xl text-xs font-semibold",
              findAccentVariant(is2024, { prism: "bg-prism-500 text-slate-950 hover:bg-prism-400", arcane: "bg-arcane-500 text-slate-950 hover:bg-arcane-400" })
            )}
          >
            Застосувати
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

