"use client";

import { ReactNode } from "react";
import { Filter, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EditionAccentTitle } from "@/components/ui/EditionAccent";
import { findEditionAccent } from "@/styles/edition-accent";

export type CatalogHeaderProps = {
  title: string;
  is2024?: boolean;
  totalCount?: number;
  filteredCount?: number;
  subtitle?: ReactNode;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  hasActiveFilters?: boolean;
  activeFiltersCount?: number;
  onOpenFilters?: () => void;
  onClearFilters?: () => void;
  headerActions?: ReactNode;
};

export function CatalogHeader({
  title,
  is2024 = false,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Пошук...",
  hasActiveFilters = false,
  activeFiltersCount = 0,
  onOpenFilters,
  onClearFilters,
  headerActions,
}: CatalogHeaderProps) {
  const edition = is2024 ? "2024" : "2014";
  const accent = findEditionAccent(edition);

  return (
    <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="font-rpg-display text-xl sm:text-2xl font-bold uppercase tracking-wider">
          <EditionAccentTitle edition={edition}>{title}</EditionAccentTitle>
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 pr-8 bg-slate-900/60 border-white/10 text-slate-100 placeholder:text-slate-500 rounded-xl h-10 text-xs md:h-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              aria-label="Очистити пошук"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {onOpenFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFilters}
            className={cn(
              "h-10 gap-1.5 rounded-xl border-white/10 bg-slate-900/60 text-xs md:h-9",
              hasActiveFilters && cn(accent.solid.text, accent.solid.border, accent.solid.fill)
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            <span>Фільтри</span>
            {hasActiveFilters && activeFiltersCount > 0 && (
              <span
                className={cn(
                  "ml-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                  accent.solid.strongFill,
                  "text-slate-950"
                )}
              >
                {activeFiltersCount}
              </span>
            )}
          </Button>
        )}

        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-10 px-2 text-xs text-slate-400 hover:text-slate-200 md:h-9"
          >
            Скинути
          </Button>
        )}

        {headerActions}
      </div>
    </div>
  );
}
