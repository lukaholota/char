"use client";

import { ChevronRight } from "lucide-react";

import { stripToPlainText } from "@/lib/logic/plain-text";
import { cn } from "@/lib/utils";
import { findAccentVariant } from "@/styles/edition-accent";

/// Одна, кілька, багато: «1 здібність», «3 здібності», «5 здібностей».
export type PluralForms = readonly [one: string, few: string, many: string];

const PLURAL_RULES = new Intl.PluralRules("uk");

export type BranchCard = {
  key: string;
  name: string;
  engName: string;
  kindLabel: string;
  sourceLabel: string | null;
  entryCount: number;
  entryCountForms: PluralForms;
  description: string | null;
};

export function BranchCardGrid({
  cards,
  is2024,
  onOpen,
}: {
  cards: readonly BranchCard[];
  is2024: boolean;
  onOpen: (key: string, opener: HTMLButtonElement) => void;
}) {
  return (
    <ul className="grid gap-3 xl:grid-cols-2">
      {cards.map((card) => (
        <li key={card.key}>
          <button
            type="button"
            data-branch-card={card.key}
            onClick={(event) => onOpen(card.key, event.currentTarget)}
            className={cn(
              "flex h-full min-h-11 w-full flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:[outline-style:solid]",
              findAccentVariant(is2024, { prism: "focus-visible:outline-prism-400/70", arcane: "focus-visible:outline-arcane-400/70" }),
            )}
          >
            <span className="flex w-full items-start gap-2">
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-100">{card.name}</span>
              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            </span>
            <span className="text-[11px] text-slate-400">
              {[card.kindLabel, card.sourceLabel, card.entryCount > 0 ? formatCount(card.entryCount, card.entryCountForms) : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
            {card.description ? (
              <span className="line-clamp-3 text-xs leading-relaxed text-slate-400">{stripToPlainText(card.description)}</span>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function formatCount(count: number, [one, few, many]: PluralForms): string {
  const category = PLURAL_RULES.select(count);
  const form = category === "one" ? one : category === "few" ? few : many;
  return `${count} ${form}`;
}
