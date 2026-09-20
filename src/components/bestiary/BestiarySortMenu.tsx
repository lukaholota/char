"use client";

import { ArrowUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CREATURE_SORT_MODES,
  DEFAULT_CREATURE_SORT,
  findCreatureSortLabel,
  type CreatureSortMode,
} from "@/lib/bestiary-sort";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

export function BestiarySortMenu({
  mode,
  onChange,
  is2024,
}: {
  mode: CreatureSortMode;
  onChange: (mode: CreatureSortMode) => void;
  is2024: boolean;
}) {
  const isDefault = mode === DEFAULT_CREATURE_SORT;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          aria-label={`Сортування: ${findCreatureSortLabel(mode)}`}
          className={cn(
            "h-9 gap-1.5 rounded-xl border-white/10 bg-slate-900/60 text-xs",
            !isDefault &&
              (findAccentVariant(is2024, { prism: "text-prism-300 border-prism-500/40 bg-prism-500/10", arcane: "text-arcane-300 border-arcane-500/40 bg-arcane-500/10" }))
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{findCreatureSortLabel(mode)}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Сортування</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {CREATURE_SORT_MODES.map((option) => (
          <DropdownMenuItem
            key={option.mode}
            onSelect={() => onChange(option.mode)}
            className="flex cursor-pointer items-center justify-between gap-2"
          >
            <span className="truncate">{option.label}</span>
            {option.mode === mode && (
              <Check className={cn("h-4 w-4", findAccentVariant(is2024, { prism: "text-prism-400", arcane: "text-arcane-400" }))} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
