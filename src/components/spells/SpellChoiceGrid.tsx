"use client";

import { useMemo } from "react";
import { Check, Info } from "lucide-react";
import { SpellSummary } from "@/components/spells/SpellSummary";
import { buildSpellLinkForSpell, openSpellLink } from "@/lib/spell-link";
import { cn } from "@/lib/utils";
import type { SpellChoiceOption } from "@/rules/spell-choice-filter";
import { findAccentVariant } from "@/styles/edition-accent";

interface Props {
  spells: readonly SpellChoiceOption[];
  selectedIds: readonly number[];
  limit: number;
  onChange: (spellIds: number[]) => void;
  findGroupLabel: (spell: SpellChoiceOption) => string;
  /** Ще не обране, чого зараз брати не можна (межа шкіл підкласу): картка лишається, але вимкнена. */
  isSelectable?: (spell: SpellChoiceOption) => boolean;
}

/** Р42 — список кандидатів на вибір заклинання: риса, крок заклинань конструктора й майстра. Картка — та сама, що в каталозі. */
export function SpellChoiceGrid({ spells, selectedIds, limit, onChange, findGroupLabel, isSelectable }: Props) {
  const groups = useMemo(() => groupSpells(spells, findGroupLabel), [spells, findGroupLabel]);
  const isFull = selectedIds.length >= limit;

  const toggleSpell = (spellId: number) => {
    if (selectedIds.includes(spellId)) {
      onChange(selectedIds.filter((id) => id !== spellId));
      return;
    }
    if (limit === 1) {
      onChange([spellId]);
      return;
    }
    if (!isFull) onChange([...selectedIds, spellId]);
  };
  const isBlocked = (spell: SpellChoiceOption, isSelected: boolean) => !isSelected && ((limit > 1 && isFull) || (isSelectable !== undefined && !isSelectable(spell)));

  return (
    <div className="space-y-4">
      {groups.map(([label, groupSpells]) => (
        <section key={label} aria-label={groups.length > 1 ? label : undefined}>
          {groups.length > 1 && <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</h3>}
          <div className="grid gap-2">
            {groupSpells.map((spell) => {
              const isSelected = selectedIds.includes(spell.spellId);
              return (
                <SpellChoiceCard
                  key={spell.spellId}
                  spell={spell}
                  isSelected={isSelected}
                  isDisabled={isBlocked(spell, isSelected)}
                  onToggle={toggleSpell}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function SpellChoiceCard({
  spell,
  isSelected,
  isDisabled,
  onToggle,
}: {
  spell: SpellChoiceOption;
  isSelected: boolean;
  isDisabled: boolean;
  onToggle: (spellId: number) => void;
}) {
  const is2024 = spell.ruleset === "RULES_2024";
  return (
    <div
      className={cn(
        "glass-panel group relative flex items-center gap-2 overflow-hidden rounded-xl border transition-all duration-300",
        isSelected
          ? cn("border-gradient-rpg border-gradient-rpg-active glass-active bg-white/5 ring-1", findAccentVariant(is2024, { prism: "ring-prism-400/40", arcane: "ring-arcane-400/40" }))
          : "border-white/10 bg-white/5 hover:bg-white/7",
        isDisabled && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(spell.spellId)}
        disabled={isDisabled}
        aria-pressed={isSelected}
        aria-label={spell.name}
        className="flex min-w-0 flex-1 items-center gap-2 p-3 text-left disabled:cursor-not-allowed"
      >
        <SpellSummary
          spell={{
            name: spell.name,
            engName: spell.engName,
            level: spell.level,
            school: spell.school,
            castingTime: spell.castingTime ?? null,
            isRitual: spell.isRitual ?? false,
            isConcentration: spell.isConcentration ?? false,
          }}
          is2024={is2024}
          isSelected={isSelected}
        />
        {isSelected && <Check className={cn("h-5 w-5 shrink-0", findAccentVariant(is2024, { prism: "text-prism-300", arcane: "text-arcane-300" }))} />}
      </button>
      <button
        type="button"
        onClick={() => openSpellLink(buildSpellLinkForSpell(spell))}
        className="mr-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-arcane-300 md:h-9 md:w-9"
        aria-label={`Опис: ${spell.name}`}
      >
        <Info className="h-4 w-4" />
      </button>
    </div>
  );
}

function groupSpells(
  spells: readonly SpellChoiceOption[],
  findGroupLabel: (spell: SpellChoiceOption) => string,
): Array<[string, SpellChoiceOption[]]> {
  const groups = new Map<string, SpellChoiceOption[]>();
  for (const spell of spells) {
    const label = findGroupLabel(spell);
    groups.set(label, [...(groups.get(label) ?? []), spell]);
  }
  return Array.from(groups.entries());
}
