"use client";

import { Wand2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { buildCastingOptionKey, type CastingSlotOption } from "@/rules/spell-casting-slots";

interface Props {
  spellName: string;
  options: readonly CastingSlotOption[];
  disabled?: boolean;
  onCast: (option: CastingSlotOption) => void;
}

/** Лист — карусель Swiper: без `swiper-no-swiping` вона гасить pointerdown, і тригер Radix не відкривається. */
export default function CastSpellMenu({ spellName, options, disabled, onCast }: Props) {
  if (options.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Накласти «${spellName}»`}
          disabled={disabled}
          title="Накласти: обрати слот"
          className="swiper-no-swiping flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-md border border-indigo-400/30 bg-indigo-500/10 text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
          onClick={(event) => event.stopPropagation()}
        >
          <Wand2 className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="px-2 py-1 text-xs text-slate-400">Накласти «{spellName}»</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem
            key={buildCastingOptionKey(option)}
            disabled={option.remaining <= 0}
            className="justify-between gap-3"
            onSelect={() => onCast(option)}
          >
            <span>{describeSlot(option)}</span>
            <span className="text-xs text-slate-400">{option.remaining}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function describeSlot(option: CastingSlotOption): string {
  if (option.kind === "FREE_USE") return `Без слоту — ${option.featureName}`;
  return option.kind === "PACT_SLOT" ? `Слот пакту ${option.slotLevel}-го рівня` : `Слот ${option.slotLevel}-го рівня`;
}
